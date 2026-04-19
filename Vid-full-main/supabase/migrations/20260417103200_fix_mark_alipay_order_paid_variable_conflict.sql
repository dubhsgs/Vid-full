/*
  # Fix ambiguous variable references in mark_alipay_order_paid

  The previous function used output column names like `client_id`,
  `remaining_credits`, and `pack_size`, which can conflict with table
  column names inside PL/pgSQL statements.
*/

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
#variable_conflict use_column
DECLARE
  order_row alipay_orders%ROWTYPE;
  quota_row user_quotas%ROWTYPE;
BEGIN
  SELECT *
  INTO order_row
  FROM public.alipay_orders AS ao
  WHERE ao.out_trade_no = p_out_trade_no
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF order_row.status = 'paid' THEN
    SELECT *
    INTO quota_row
    FROM public.user_quotas AS uq
    WHERE uq.client_id = order_row.client_id;

    already_processed := true;
    client_id := order_row.client_id;
    remaining_credits := COALESCE(quota_row.remaining_credits, 0);
    pack_size := order_row.pack_size;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.user_quotas AS uq (client_id, remaining_credits, total_used)
  VALUES (order_row.client_id, order_row.pack_size, 0)
  ON CONFLICT (client_id) DO UPDATE
    SET remaining_credits = uq.remaining_credits + EXCLUDED.remaining_credits,
        updated_at = now()
  RETURNING * INTO quota_row;

  UPDATE public.alipay_orders AS ao
  SET status = 'paid',
      trade_no = p_trade_no,
      paid_at = COALESCE(p_paid_at, now())
  WHERE ao.out_trade_no = p_out_trade_no
  RETURNING * INTO order_row;

  already_processed := false;
  client_id := order_row.client_id;
  remaining_credits := quota_row.remaining_credits;
  pack_size := order_row.pack_size;
  RETURN NEXT;
END;
$$;
