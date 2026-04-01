/*
  # Fix Security Issues

  ## Changes
  1. Drop unused indexes to improve database performance
     - `idx_payment_orders_license_key_id` - not being used in queries
     - `idx_alipay_orders_client_id` - client_id queries are infrequent
     - `idx_alipay_orders_out_trade_no` - out_trade_no has UNIQUE constraint which creates implicit index
     - `idx_alipay_orders_trade_no` - trade_no has UNIQUE constraint which creates implicit index
     - `idx_alipay_orders_status` - status queries are infrequent

  2. Fix function search path security issue
     - Recreate `update_updated_at_column` function with stable search_path
     - Add `SET search_path = pg_catalog, public` to prevent search path manipulation
*/

-- Drop unused indexes
DROP INDEX IF EXISTS idx_payment_orders_license_key_id;
DROP INDEX IF EXISTS idx_alipay_orders_client_id;
DROP INDEX IF EXISTS idx_alipay_orders_out_trade_no;
DROP INDEX IF EXISTS idx_alipay_orders_trade_no;
DROP INDEX IF EXISTS idx_alipay_orders_status;

-- Recreate update_updated_at_column function with stable search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;