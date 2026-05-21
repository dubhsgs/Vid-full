-- Limit automatic free-credit grants by account, browser fingerprint, and IP.

CREATE TABLE IF NOT EXISTS public.free_credit_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_hash text,
  device_fingerprint_hash text NOT NULL,
  granted_credits integer NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT free_credit_claims_user_unique UNIQUE (user_id),
  CONSTRAINT free_credit_claims_fingerprint_unique UNIQUE (device_fingerprint_hash),
  CONSTRAINT free_credit_claims_ip_hash_format CHECK (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT free_credit_claims_fingerprint_format CHECK (device_fingerprint_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT free_credit_claims_granted_positive CHECK (granted_credits BETWEEN 0 AND 20)
);

ALTER TABLE public.free_credit_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.free_credit_claims FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_free_credit_claims_ip_hash_created_at
  ON public.free_credit_claims (ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_free_credits(
  p_user_id uuid,
  p_ip_hash text,
  p_device_fingerprint_hash text,
  p_granted_credits integer DEFAULT 2
)
RETURNS TABLE(
  claimed boolean,
  free_credits integer,
  paid_credits integer,
  total_used integer,
  claim_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  credit_row public.user_credits%ROWTYPE;
  normalized_ip_hash text;
  normalized_fingerprint_hash text;
  recent_ip_claims integer;
  confirmed_at timestamptz;
  grant_amount integer := 2;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT au.email_confirmed_at
  INTO confirmed_at
  FROM auth.users AS au
  WHERE au.id = p_user_id;

  IF confirmed_at IS NULL THEN
    RAISE EXCEPTION 'EMAIL_NOT_CONFIRMED';
  END IF;

  normalized_ip_hash := lower(nullif(trim(coalesce(p_ip_hash, '')), ''));
  normalized_fingerprint_hash := lower(nullif(trim(coalesce(p_device_fingerprint_hash, '')), ''));
  grant_amount := greatest(0, least(coalesce(p_granted_credits, 2), 20));

  IF normalized_ip_hash IS NOT NULL AND normalized_ip_hash !~ '^[0-9a-f]{64}$' THEN
    normalized_ip_hash := NULL;
  END IF;

  IF normalized_fingerprint_hash IS NULL OR normalized_fingerprint_hash !~ '^[0-9a-f]{64}$' THEN
    claimed := false;
    free_credits := 0;
    paid_credits := 0;
    total_used := 0;
    claim_reason := 'missing_fingerprint';
    RETURN NEXT;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(coalesce(normalized_ip_hash, normalized_fingerprint_hash))::bigint);

  SELECT *
  INTO credit_row
  FROM public.user_credits AS uc
  WHERE uc.user_id = p_user_id
  FOR UPDATE;

  IF FOUND THEN
    claimed := false;
    free_credits := coalesce(credit_row.free_credits, 0);
    paid_credits := coalesce(credit_row.paid_credits, 0);
    total_used := coalesce(credit_row.total_used, 0);
    claim_reason := 'existing_credits';
    RETURN NEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.free_credit_claims AS fcc WHERE fcc.user_id = p_user_id
  ) THEN
    claimed := false;
    free_credits := 0;
    paid_credits := 0;
    total_used := 0;
    claim_reason := 'user_already_claimed';
    RETURN NEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.free_credit_claims AS fcc
    WHERE fcc.device_fingerprint_hash = normalized_fingerprint_hash
  ) THEN
    claimed := false;
    free_credits := 0;
    paid_credits := 0;
    total_used := 0;
    claim_reason := 'fingerprint_limited';
    RETURN NEXT;
    RETURN;
  END IF;

  IF normalized_ip_hash IS NOT NULL THEN
    SELECT count(*)::integer
    INTO recent_ip_claims
    FROM public.free_credit_claims AS fcc
    WHERE fcc.ip_hash = normalized_ip_hash
      AND fcc.created_at >= now() - interval '24 hours';

    IF coalesce(recent_ip_claims, 0) >= 1 THEN
      claimed := false;
      free_credits := 0;
      paid_credits := 0;
      total_used := 0;
      claim_reason := 'ip_limited';
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.free_credit_claims (user_id, ip_hash, device_fingerprint_hash, granted_credits)
  VALUES (p_user_id, normalized_ip_hash, normalized_fingerprint_hash, grant_amount);

  INSERT INTO public.user_credits (user_id, free_credits, paid_credits, total_used)
  VALUES (p_user_id, grant_amount, 0, 0)
  RETURNING * INTO credit_row;

  claimed := true;
  free_credits := credit_row.free_credits;
  paid_credits := credit_row.paid_credits;
  total_used := credit_row.total_used;
  claim_reason := 'claimed';
  RETURN NEXT;
EXCEPTION
  WHEN unique_violation THEN
    claimed := false;
    free_credits := 0;
    paid_credits := 0;
    total_used := 0;
    claim_reason := 'already_claimed';
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_free_credits(uuid, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_free_credits(uuid, text, text, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.register_v_id(
  p_user_id uuid,
  p_character_name text,
  p_creator_name text,
  p_sha256_hash text,
  p_image_url text
)
RETURNS TABLE(
  result_status text,
  friendly_id text,
  free_credits integer,
  paid_credits integer,
  total_used integer,
  credit_consumed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  credit_row public.user_credits%ROWTYPE;
  existing_row public.v_ids%ROWTYPE;
  inserted_row public.v_ids%ROWTYPE;
  next_friendly_id text;
  normalized_sha256 text;
  confirmed_at timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT au.email_confirmed_at
  INTO confirmed_at
  FROM auth.users AS au
  WHERE au.id = p_user_id;

  IF confirmed_at IS NULL THEN
    RAISE EXCEPTION 'EMAIL_NOT_CONFIRMED';
  END IF;

  IF length(trim(coalesce(p_character_name, ''))) = 0 THEN
    RAISE EXCEPTION 'CHARACTER_NAME_REQUIRED';
  END IF;

  IF length(trim(coalesce(p_creator_name, ''))) = 0 THEN
    RAISE EXCEPTION 'CREATOR_NAME_REQUIRED';
  END IF;

  normalized_sha256 := lower(trim(coalesce(p_sha256_hash, '')));
  IF normalized_sha256 !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'INVALID_SHA256_HASH';
  END IF;

  IF length(trim(coalesce(p_image_url, ''))) = 0 THEN
    RAISE EXCEPTION 'IMAGE_URL_REQUIRED';
  END IF;

  SELECT *
  INTO existing_row
  FROM public.v_ids AS v
  WHERE v.sha256_hash = normalized_sha256;

  IF FOUND THEN
    result_status := 'duplicate';
    friendly_id := existing_row.friendly_id;

    SELECT *
    INTO credit_row
    FROM public.user_credits AS uc
    WHERE uc.user_id = p_user_id;

    free_credits := coalesce(credit_row.free_credits, 0);
    paid_credits := coalesce(credit_row.paid_credits, 0);
    total_used := coalesce(credit_row.total_used, 0);
    credit_consumed := false;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT *
  INTO credit_row
  FROM public.user_credits AS uc
  WHERE uc.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR (credit_row.free_credits <= 0 AND credit_row.paid_credits <= 0) THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  IF credit_row.free_credits > 0 THEN
    UPDATE public.user_credits AS uc
    SET free_credits = uc.free_credits - 1,
        total_used = uc.total_used + 1,
        updated_at = now()
    WHERE uc.user_id = p_user_id
    RETURNING * INTO credit_row;
  ELSE
    UPDATE public.user_credits AS uc
    SET paid_credits = uc.paid_credits - 1,
        total_used = uc.total_used + 1,
        updated_at = now()
    WHERE uc.user_id = p_user_id
    RETURNING * INTO credit_row;
  END IF;

  next_friendly_id := public.generate_v_id_friendly_id();

  INSERT INTO public.v_ids (
    user_id,
    friendly_id,
    character_name,
    creator_name,
    sha256_hash,
    original_file_hash,
    image_url,
    ots_status
  )
  VALUES (
    p_user_id,
    next_friendly_id,
    trim(p_character_name),
    trim(p_creator_name),
    normalized_sha256,
    normalized_sha256,
    trim(p_image_url),
    'pending'
  )
  RETURNING * INTO inserted_row;

  INSERT INTO public.ots_jobs (friendly_id, status)
  VALUES (inserted_row.friendly_id, 'pending');

  result_status := 'created';
  friendly_id := inserted_row.friendly_id;
  free_credits := credit_row.free_credits;
  paid_credits := credit_row.paid_credits;
  total_used := credit_row.total_used;
  credit_consumed := true;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.register_v_id(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_v_id(uuid, text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_alipay_order_paid_to_credits(
  p_out_trade_no text,
  p_trade_no text,
  p_paid_at timestamptz DEFAULT now()
)
RETURNS TABLE(
  already_processed boolean,
  user_id uuid,
  added_credits integer,
  paid_credits integer,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_row public.alipay_orders%ROWTYPE;
  credit_row public.user_credits%ROWTYPE;
  confirmed_at timestamptz;
BEGIN
  SELECT *
  INTO order_row
  FROM public.alipay_orders AS ao
  WHERE ao.out_trade_no = p_out_trade_no
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF order_row.user_id IS NULL THEN
    RAISE EXCEPTION 'ORDER_USER_ID_REQUIRED';
  END IF;

  SELECT au.email_confirmed_at
  INTO confirmed_at
  FROM auth.users AS au
  WHERE au.id = order_row.user_id;

  IF confirmed_at IS NULL THEN
    RAISE EXCEPTION 'EMAIL_NOT_CONFIRMED';
  END IF;

  IF order_row.status = 'paid' THEN
    SELECT *
    INTO credit_row
    FROM public.user_credits AS uc
    WHERE uc.user_id = order_row.user_id;

    already_processed := true;
    user_id := order_row.user_id;
    added_credits := 0;
    paid_credits := coalesce(credit_row.paid_credits, 0);
    status := order_row.status;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.user_credits (user_id, free_credits, paid_credits, total_used)
  VALUES (order_row.user_id, 2, order_row.pack_size, 0)
  ON CONFLICT ON CONSTRAINT user_credits_pkey DO UPDATE
    SET paid_credits = public.user_credits.paid_credits + EXCLUDED.paid_credits,
        updated_at = now()
  RETURNING * INTO credit_row;

  UPDATE public.alipay_orders AS ao
  SET status = 'paid',
      trade_no = p_trade_no,
      paid_at = coalesce(p_paid_at, now()),
      updated_at = now()
  WHERE ao.out_trade_no = p_out_trade_no
  RETURNING * INTO order_row;

  already_processed := false;
  user_id := order_row.user_id;
  added_credits := order_row.pack_size;
  paid_credits := credit_row.paid_credits;
  status := order_row.status;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_alipay_order_paid_to_credits(text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_alipay_order_paid_to_credits(text, text, timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.redeem_license_key_to_credits(
  p_key text,
  p_user_id uuid
)
RETURNS TABLE(
  redeemed boolean,
  added_credits integer,
  paid_credits integer,
  key_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  license_row public.license_keys%ROWTYPE;
  credit_row public.user_credits%ROWTYPE;
  confirmed_at timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT au.email_confirmed_at
  INTO confirmed_at
  FROM auth.users AS au
  WHERE au.id = p_user_id;

  IF confirmed_at IS NULL THEN
    RAISE EXCEPTION 'EMAIL_NOT_CONFIRMED';
  END IF;

  SELECT *
  INTO license_row
  FROM public.license_keys AS lk
  WHERE lk.key = upper(trim(p_key))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF license_row.status <> 'active'
     OR license_row.remaining_uses <= 0
     OR license_row.redeemed_by_user_id IS NOT NULL THEN
    redeemed := false;
    added_credits := 0;
    paid_credits := 0;
    key_status := coalesce(license_row.status, 'unavailable');
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.user_credits (user_id, free_credits, paid_credits, total_used)
  VALUES (p_user_id, 2, license_row.remaining_uses, 0)
  ON CONFLICT ON CONSTRAINT user_credits_pkey DO UPDATE
    SET paid_credits = public.user_credits.paid_credits + EXCLUDED.paid_credits,
        updated_at = now()
  RETURNING * INTO credit_row;

  UPDATE public.license_keys AS lk
  SET redeemed_by_user_id = p_user_id,
      redeemed_at = now(),
      remaining_uses = 0,
      used = true,
      status = 'exhausted',
      last_used_at = now()
  WHERE lk.id = license_row.id;

  redeemed := true;
  added_credits := license_row.remaining_uses;
  paid_credits := credit_row.paid_credits;
  key_status := 'redeemed';
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_license_key_to_credits(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_license_key_to_credits(text, uuid) TO service_role;
