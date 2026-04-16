/*
  # Fix all pack_size constraints in alipay_orders

  1. Changes
    - Drop old pack_size constraints (pack_size_valid, alipay_orders_pack_size_check)
    - Add new constraint allowing [1, 5, 10]
*/

DO $$
BEGIN
  -- Drop all old pack_size related constraints
  ALTER TABLE alipay_orders
  DROP CONSTRAINT IF EXISTS pack_size_valid;
  
  ALTER TABLE alipay_orders
  DROP CONSTRAINT IF EXISTS alipay_orders_pack_size_check;
  
  -- Add the single unified constraint with new values
  ALTER TABLE alipay_orders
  ADD CONSTRAINT alipay_orders_pack_size_check
  CHECK (pack_size = ANY (ARRAY[1, 5, 10]));
END $$;
