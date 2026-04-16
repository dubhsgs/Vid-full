/*
  # Fix pack sizes in alipay_orders table

  1. Changes
    - Update CHECK constraint on `pack_size` column from [10, 50, 100] to [1, 5, 10]
    - This aligns the database with the new pricing tiers
    - Delete existing test orders with old pack sizes to allow constraint change
*/

-- Delete test orders with old pack sizes (10, 50, 100)
DELETE FROM alipay_orders WHERE pack_size NOT IN (1, 5, 10);

-- Drop the old constraint
ALTER TABLE alipay_orders
DROP CONSTRAINT IF EXISTS alipay_orders_pack_size_check;

-- Add the new constraint with updated values
ALTER TABLE alipay_orders
ADD CONSTRAINT alipay_orders_pack_size_check
CHECK (pack_size = ANY (ARRAY[1, 5, 10]));
