/*
  # Fix payment flow and quota atomicity

  1. Align `alipay_orders.pack_size` with the current plans (1/5/10)
  2. Add an atomic credit-consumption RPC for certificate issuance
  3. Add an atomic payment-settlement RPC for Alipay notifications
*/

ALTER TABLE alipay_orders
  DROP CONSTRAINT IF EXISTS pack_size_valid;

ALTER TABLE alipay_orders
  ADD CONSTRAINT pack_size_valid CHECK (pack_size IN (1, 5, 10));

CREATE OR REPLACE FUNCTION public.consume_user_credit(p_client_id text)
RETURNS TABLE(remaining_credits integer, total_used integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_quota user_quotas%ROWTYPE;
BEGIN
  UPDATE user_quotas
  SET remaining_credits = remaining_credits - 1,
      total_used = total_used + 1,
      updated_at = now()
  WHERE client_id = p_client_id
    AND remaining_credits > 0
  RETURNING * INTO updated_quota;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  remaining_credits := updated_quota.remaining_credits;
  total_used := updated_quota.total_used;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_alipay_order_paid(
  p_out_trade_no text,
  p_trade_no text,
  p_paid_at timestamptz DEFAULT now()
)
RETURNS TABLE(
  already_processed boolean,
  client_id text,
  remaining_credits integer,
  pack_size integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_row alipay_orders%ROWTYPE;
  quota_row user_quotas%ROWTYPE;
BEGIN
  SELECT *
  INTO order_row
  FROM alipay_orders
  WHERE out_trade_no = p_out_trade_no
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF order_row.status = 'paid' THEN
    SELECT *
    INTO quota_row
    FROM user_quotas
    WHERE user_quotas.client_id = order_row.client_id;

    already_processed := true;
    client_id := order_row.client_id;
    remaining_credits := COALESCE(quota_row.remaining_credits, 0);
    pack_size := order_row.pack_size;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO user_quotas (client_id, remaining_credits, total_used)
  VALUES (order_row.client_id, order_row.pack_size, 0)
  ON CONFLICT (client_id) DO UPDATE
    SET remaining_credits = user_quotas.remaining_credits + EXCLUDED.remaining_credits,
        updated_at = now()
  RETURNING * INTO quota_row;

  UPDATE alipay_orders
  SET status = 'paid',
      trade_no = p_trade_no,
      paid_at = COALESCE(p_paid_at, now())
  WHERE out_trade_no = p_out_trade_no
  RETURNING * INTO order_row;

  already_processed := false;
  client_id := order_row.client_id;
  remaining_credits := quota_row.remaining_credits;
  pack_size := order_row.pack_size;
  RETURN NEXT;
END;
$$;
