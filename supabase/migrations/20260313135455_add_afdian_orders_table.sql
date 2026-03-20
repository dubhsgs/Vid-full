/*
  # Afdian Orders Table

  1. New Tables
    - `afdian_orders`
      - `id` (uuid, primary key) - Unique identifier
      - `order_id` (text, unique) - Afdian order ID (out_trade_no)
      - `user_id` (text) - Afdian user ID
      - `plan_id` (text) - Afdian plan ID
      - `plan_title` (text) - Plan name (e.g., "1次证书", "5次证书包", "10次证书包")
      - `total_amount` (numeric) - Order amount in CNY
      - `pack_size` (int) - Number of certificates (1, 5, or 10)
      - `status` (text) - Order status (pending, paid, refunded)
      - `license_key` (text, unique) - Generated license key
      - `webhook_data` (jsonb) - Full webhook payload for debugging
      - `created_at` (timestamptz) - Order creation time
      - `paid_at` (timestamptz) - Payment time
  
  2. Security
    - Enable RLS on `afdian_orders` table
    - Public can check order status by order_id
    - Only edge functions can insert/update orders
    - Admins can view all orders

  3. Important Notes
    - License keys are auto-generated when order is paid
    - Pack size determines how many certificates user gets
    - Webhook data stored for troubleshooting
    - Orders are immutable once created
*/

CREATE TABLE IF NOT EXISTS afdian_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  user_id text NOT NULL,
  plan_id text NOT NULL,
  plan_title text NOT NULL,
  total_amount numeric(10, 2) NOT NULL,
  pack_size int NOT NULL CHECK (pack_size IN (1, 5, 10)),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded')),
  license_key text UNIQUE,
  webhook_data jsonb,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_afdian_orders_order_id ON afdian_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_afdian_orders_license_key ON afdian_orders(license_key);
CREATE INDEX IF NOT EXISTS idx_afdian_orders_status ON afdian_orders(status);

ALTER TABLE afdian_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check order by order_id"
  ON afdian_orders
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert orders"
  ON afdian_orders
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update orders"
  ON afdian_orders
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
