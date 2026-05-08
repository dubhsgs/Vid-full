-- Payment model now credits authenticated accounts directly.
-- license_key remains nullable and is reserved for optional/offline activation-code channels.
-- Paid in-site Alipay orders must not require a license_key anymore.

ALTER TABLE public.alipay_orders
  DROP CONSTRAINT IF EXISTS alipay_orders_paid_requires_license_key;
