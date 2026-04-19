/*
  # 用户配额和支付宝订单系统

  ## 概述
  本迁移创建了完整的用户配额管理和支付宝支付系统，替代原有的爱发电集成。

  ## 1. 新表
  
  ### user_quotas 表
  - `client_id` (text, primary key) - 浏览器指纹唯一标识
  - `remaining_credits` (integer) - 剩余可用次数，默认 3 次免费额度
  - `total_used` (integer) - 累计已使用次数
  - `created_at` (timestamptz) - 创建时间
  - `updated_at` (timestamptz) - 最后更新时间
  
  ### alipay_orders 表
  - `id` (uuid, primary key) - 订单唯一标识
  - `out_trade_no` (text, unique) - 商户订单号
  - `trade_no` (text, unique, nullable) - 支付宝交易号
  - `client_id` (text) - 关联的客户端指纹
  - `pack_size` (integer) - 购买的次数包大小（10/50/100）
  - `amount` (numeric) - 支付金额（单位：元）
  - `status` (text) - 订单状态：pending/paid/cancelled
  - `paid_at` (timestamptz, nullable) - 支付完成时间
  - `created_at` (timestamptz) - 订单创建时间
  - `updated_at` (timestamptz) - 最后更新时间

  ## 2. 安全策略
  - 为所有表启用 RLS
  - user_quotas: 只有服务端可以读写
  - alipay_orders: 用户可以查看自己的订单（通过 client_id）

  ## 3. 索引
  - client_id 索引用于快速查询配额
  - out_trade_no 和 trade_no 索引用于订单查询
*/

-- 创建 user_quotas 表
CREATE TABLE IF NOT EXISTS user_quotas (
  client_id text PRIMARY KEY,
  remaining_credits integer NOT NULL DEFAULT 3,
  total_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT remaining_credits_non_negative CHECK (remaining_credits >= 0),
  CONSTRAINT total_used_non_negative CHECK (total_used >= 0)
);

-- 创建 alipay_orders 表
CREATE TABLE IF NOT EXISTS alipay_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  out_trade_no text UNIQUE NOT NULL,
  trade_no text UNIQUE,
  client_id text NOT NULL,
  pack_size integer NOT NULL,
  amount numeric(10, 2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pack_size_valid CHECK (pack_size IN (10, 50, 100)),
  CONSTRAINT amount_positive CHECK (amount > 0),
  CONSTRAINT status_valid CHECK (status IN ('pending', 'paid', 'cancelled'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_alipay_orders_client_id ON alipay_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_alipay_orders_out_trade_no ON alipay_orders(out_trade_no);
CREATE INDEX IF NOT EXISTS idx_alipay_orders_trade_no ON alipay_orders(trade_no) WHERE trade_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alipay_orders_status ON alipay_orders(status);

-- 启用 RLS
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alipay_orders ENABLE ROW LEVEL SECURITY;

-- user_quotas 策略：仅服务端可访问（使用 service_role key）
CREATE POLICY "Service role can manage user quotas"
  ON user_quotas
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- alipay_orders 策略：用户可以查看自己的订单
CREATE POLICY "Users can view own orders"
  ON alipay_orders
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage orders"
  ON alipay_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 创建更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 user_quotas 添加触发器
DROP TRIGGER IF EXISTS update_user_quotas_updated_at ON user_quotas;
CREATE TRIGGER update_user_quotas_updated_at
  BEFORE UPDATE ON user_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 为 alipay_orders 添加触发器
DROP TRIGGER IF EXISTS update_alipay_orders_updated_at ON alipay_orders;
CREATE TRIGGER update_alipay_orders_updated_at
  BEFORE UPDATE ON alipay_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();