-- Fix production payment settlement RPC: the OUT column "user_id" makes
-- ON CONFLICT (user_id) ambiguous inside PL/pgSQL. Use the explicit primary
-- key constraint instead so paid Alipay orders can credit accounts correctly.

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
  VALUES (order_row.user_id, 3, order_row.pack_size, 0)
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
