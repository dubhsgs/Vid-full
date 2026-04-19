/*
  # Switch paid credits to activation-code delivery

  1. Keep `user_quotas` for free trial only
  2. Extend `license_keys` so one paid order issues one reusable activation code
  3. Store the issued activation code on `alipay_orders`
  4. Make payment settlement and activation-code issuance atomic
  5. Add an atomic activation-code consumption RPC
*/

ALTER TABLE public.alipay_orders
  ADD COLUMN IF NOT EXISTS license_key text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'alipay_orders_license_key_unique'
      AND conrelid = 'public.alipay_orders'::regclass
  ) THEN
    ALTER TABLE public.alipay_orders
      ADD CONSTRAINT alipay_orders_license_key_unique UNIQUE (license_key);
  END IF;
END $$;

ALTER TABLE public.license_keys
  ADD COLUMN IF NOT EXISTS total_uses integer,
  ADD COLUMN IF NOT EXISTS remaining_uses integer,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS order_out_trade_no text;

UPDATE public.license_keys
SET
  total_uses = COALESCE(total_uses, pack_size),
  remaining_uses = COALESCE(remaining_uses, CASE WHEN COALESCE(used, false) THEN 0 ELSE pack_size END),
  status = COALESCE(
    status,
    CASE
      WHEN COALESCE(used, false) OR COALESCE(remaining_uses, 0) = 0 THEN 'exhausted'
      ELSE 'active'
    END
  );

ALTER TABLE public.license_keys
  ALTER COLUMN total_uses SET NOT NULL,
  ALTER COLUMN remaining_uses SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'license_keys_total_uses_positive'
      AND conrelid = 'public.license_keys'::regclass
  ) THEN
    ALTER TABLE public.license_keys
      ADD CONSTRAINT license_keys_total_uses_positive CHECK (total_uses > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'license_keys_remaining_uses_non_negative'
      AND conrelid = 'public.license_keys'::regclass
  ) THEN
    ALTER TABLE public.license_keys
      ADD CONSTRAINT license_keys_remaining_uses_non_negative CHECK (remaining_uses >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'license_keys_status_valid'
      AND conrelid = 'public.license_keys'::regclass
  ) THEN
    ALTER TABLE public.license_keys
      ADD CONSTRAINT license_keys_status_valid CHECK (status IN ('active', 'exhausted', 'revoked'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_license_keys_order_out_trade_no
  ON public.license_keys(order_out_trade_no)
  WHERE order_out_trade_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_license_keys_status
  ON public.license_keys(status);

DROP POLICY IF EXISTS "Anyone can check if a specific key exists" ON public.license_keys;
DROP POLICY IF EXISTS "Only authenticated users can mark keys as used" ON public.license_keys;
DROP POLICY IF EXISTS "Service role can manage license keys" ON public.license_keys;

CREATE POLICY "Service role can manage license keys"
  ON public.license_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.generate_license_key_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  part text;
  candidate text;
  i integer;
  j integer;
BEGIN
  LOOP
    candidate := 'VAID';

    FOR i IN 1..3 LOOP
      part := '';
      FOR j IN 1..4 LOOP
        part := part || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
      END LOOP;
      candidate := candidate || '-' || part;
    END LOOP;

    IF NOT EXISTS (
      SELECT 1
      FROM public.license_keys AS lk
      WHERE lk.key = candidate
    ) THEN
      RETURN candidate;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_alipay_order_paid(
  p_out_trade_no text,
  p_trade_no text,
  p_paid_at timestamptz DEFAULT now()
)
RETURNS TABLE(
  already_processed boolean,
  license_key text,
  pack_size integer,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  order_row public.alipay_orders%ROWTYPE;
  license_row public.license_keys%ROWTYPE;
  generated_key text;
BEGIN
  SELECT *
  INTO order_row
  FROM public.alipay_orders AS ao
  WHERE ao.out_trade_no = p_out_trade_no
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF order_row.status = 'paid' AND order_row.license_key IS NULL THEN
    SELECT *
    INTO license_row
    FROM public.license_keys AS lk
    WHERE lk.order_out_trade_no = order_row.out_trade_no;

    IF NOT FOUND THEN
      generated_key := public.generate_license_key_code();

      INSERT INTO public.license_keys (
        key,
        pack_size,
        total_uses,
        remaining_uses,
        status,
        used,
        order_out_trade_no
      )
      VALUES (
        generated_key,
        order_row.pack_size,
        order_row.pack_size,
        order_row.pack_size,
        'active',
        false,
        order_row.out_trade_no
      )
      RETURNING * INTO license_row;
    END IF;

    UPDATE public.alipay_orders AS ao
    SET license_key = license_row.key
    WHERE ao.out_trade_no = order_row.out_trade_no
    RETURNING * INTO order_row;
  END IF;

  IF order_row.status = 'paid' THEN
    IF order_row.license_key IS NOT NULL THEN
      SELECT *
      INTO license_row
      FROM public.license_keys AS lk
      WHERE lk.key = order_row.license_key;
    END IF;

    already_processed := true;
    license_key := order_row.license_key;
    pack_size := order_row.pack_size;
    status := order_row.status;
    RETURN NEXT;
    RETURN;
  END IF;

  generated_key := public.generate_license_key_code();

  INSERT INTO public.license_keys (
    key,
    pack_size,
    total_uses,
    remaining_uses,
    status,
    used,
    order_out_trade_no
  )
  VALUES (
    generated_key,
    order_row.pack_size,
    order_row.pack_size,
    order_row.pack_size,
    'active',
    false,
    order_row.out_trade_no
  )
  RETURNING * INTO license_row;

  UPDATE public.alipay_orders AS ao
  SET status = 'paid',
      trade_no = p_trade_no,
      paid_at = COALESCE(p_paid_at, now()),
      license_key = license_row.key
  WHERE ao.out_trade_no = p_out_trade_no
  RETURNING * INTO order_row;

  already_processed := false;
  license_key := license_row.key;
  pack_size := order_row.pack_size;
  status := order_row.status;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_license_key_use(p_key text)
RETURNS TABLE(
  key text,
  remaining_uses integer,
  total_uses integer,
  status text,
  pack_size integer,
  consumed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  license_row public.license_keys%ROWTYPE;
  next_remaining integer;
BEGIN
  SELECT *
  INTO license_row
  FROM public.license_keys AS lk
  WHERE lk.key = p_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF license_row.status <> 'active' OR license_row.remaining_uses <= 0 THEN
    key := license_row.key;
    remaining_uses := GREATEST(license_row.remaining_uses, 0);
    total_uses := license_row.total_uses;
    status := CASE
      WHEN license_row.status = 'revoked' THEN 'revoked'
      ELSE 'exhausted'
    END;
    pack_size := license_row.pack_size;
    consumed := false;
    RETURN NEXT;
    RETURN;
  END IF;

  next_remaining := license_row.remaining_uses - 1;

  UPDATE public.license_keys AS lk
  SET remaining_uses = next_remaining,
      status = CASE WHEN next_remaining = 0 THEN 'exhausted' ELSE 'active' END,
      used = CASE WHEN next_remaining = 0 THEN true ELSE false END,
      activated_at = COALESCE(lk.activated_at, now()),
      last_used_at = now()
  WHERE lk.id = license_row.id
  RETURNING * INTO license_row;

  key := license_row.key;
  remaining_uses := license_row.remaining_uses;
  total_uses := license_row.total_uses;
  status := license_row.status;
  pack_size := license_row.pack_size;
  consumed := true;
  RETURN NEXT;
END;
$$;
