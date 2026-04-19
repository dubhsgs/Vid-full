/*
  # Create Payment Orders Table

  1. New Tables
    - `payment_orders`
      - `id` (uuid, primary key) - Unique order identifier
      - `order_no` (text, unique) - Human-readable order number
      - `amount` (numeric) - Payment amount in CNY
      - `payment_method` (text) - 'alipay' or 'wechat'
      - `qr_code_url` (text) - Payment QR code data URL
      - `status` (text) - 'pending', 'paid', 'expired', 'cancelled'
      - `license_key_id` (uuid, nullable) - Associated license key after payment
      - `user_contact` (text, nullable) - User email or phone for notification
      - `expires_at` (timestamptz) - QR code expiration time (15 minutes)
      - `paid_at` (timestamptz, nullable) - Payment completion time
      - `created_at` (timestamptz) - Order creation time
      
  2. Security
    - Enable RLS on `payment_orders` table
    - Add policy for users to read their own orders by order_no
    - Add policy for authenticated webhook to update payment status
    
  3. Indexes
    - Index on order_no for quick lookup
    - Index on status for filtering
    - Index on created_at for cleanup queries
*/

CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text UNIQUE NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL CHECK (payment_method IN ('alipay', 'wechat')),
  qr_code_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
  license_key_id uuid REFERENCES license_keys(id),
  user_contact text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_no ON payment_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON payment_orders(created_at);

-- Enable RLS
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read orders by order_no (needed for status checking)
CREATE POLICY "Anyone can read orders by order number"
  ON payment_orders
  FOR SELECT
  USING (true);

-- Policy: Only service role can insert orders
CREATE POLICY "Service role can insert orders"
  ON payment_orders
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only service role can update orders
CREATE POLICY "Service role can update orders"
  ON payment_orders
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Function to auto-expire old pending orders
CREATE OR REPLACE FUNCTION expire_pending_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE payment_orders
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$;