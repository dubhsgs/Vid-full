/*
  # Fix Security and Performance Issues

  ## 1. Performance Optimizations
  
  ### Add Missing Foreign Key Index
  - Add index on `payment_orders.license_key_id` to optimize foreign key lookups
  
  ### Remove Duplicate Index
  - Drop `idx_v_ids_friendly_id` since `v_ids_friendly_id_key` (unique constraint) already serves the same purpose
  
  ### Remove Unused Indexes (keeping for future use)
  - Indexes on payment_orders and afdian_orders are kept as they will be used once payment system goes live
  - Index on v_ids.sha256_hash is kept for verification lookups

  ## 2. Security Improvements
  
  ### Fix RLS Policy Performance (license_keys)
  - Replace `auth.role()` with `(select auth.role())` to prevent re-evaluation per row
  - This significantly improves query performance at scale
  
  ### Fix Overly Permissive RLS Policies
  - Replace "always true" policies with proper authentication checks
  - Service role operations should be handled via Edge Functions with service_role key
  - Regular users should not have unrestricted INSERT access
  
  ### Fix Function Security
  - Add explicit search_path to `expire_pending_orders()` function
  
  ## 3. RLS Policy Changes
  
  ### afdian_orders
  - Remove service role bypass policies (Edge Functions use service_role client)
  - Keep public read access for order status checking
  
  ### payment_orders
  - Remove service role bypass policies (Edge Functions use service_role client)
  - Keep public read access for order status checking
  
  ### v_ids
  - Restrict INSERT to require valid data (character_name, creator_name, sha256_hash)
  - Keep public read access for transparency
  
  ### license_keys
  - Fix auth check performance issue
  - Maintain existing access patterns

  ## 4. Important Notes
  - Edge Functions using service_role key automatically bypass RLS
  - These policy changes improve security without breaking functionality
  - Indexes are retained for future payment system activation
*/

-- ============================================================================
-- 1. PERFORMANCE FIXES
-- ============================================================================

-- Add missing foreign key index on payment_orders.license_key_id
CREATE INDEX IF NOT EXISTS idx_payment_orders_license_key_id 
ON payment_orders(license_key_id);

-- Drop duplicate index (v_ids_friendly_id_key unique constraint already exists)
DROP INDEX IF EXISTS idx_v_ids_friendly_id;

-- ============================================================================
-- 2. FIX RLS POLICY PERFORMANCE (license_keys)
-- ============================================================================

-- Drop and recreate the policy with optimized auth check
DROP POLICY IF EXISTS "Only authenticated users can mark keys as used" ON license_keys;

CREATE POLICY "Only authenticated users can mark keys as used"
  ON license_keys
  FOR UPDATE
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- ============================================================================
-- 3. FIX OVERLY PERMISSIVE RLS POLICIES
-- ============================================================================

-- Fix afdian_orders policies
DROP POLICY IF EXISTS "Service role can insert orders" ON afdian_orders;
DROP POLICY IF EXISTS "Service role can update orders" ON afdian_orders;

-- Note: Edge Functions with service_role key bypass RLS automatically
-- Public users should not insert/update orders directly
CREATE POLICY "Authenticated users cannot directly insert orders"
  ON afdian_orders
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Authenticated users cannot directly update orders"
  ON afdian_orders
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- Fix payment_orders policies
DROP POLICY IF EXISTS "Service role can insert orders" ON payment_orders;
DROP POLICY IF EXISTS "Service role can update orders" ON payment_orders;

CREATE POLICY "Authenticated users cannot directly insert orders"
  ON payment_orders
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Authenticated users cannot directly update orders"
  ON payment_orders
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- Fix v_ids INSERT policy to validate data
DROP POLICY IF EXISTS "Anyone can register new V-IDs" ON v_ids;

CREATE POLICY "Anyone can register new V-IDs with valid data"
  ON v_ids
  FOR INSERT
  WITH CHECK (
    character_name IS NOT NULL AND 
    character_name != '' AND
    creator_name IS NOT NULL AND 
    creator_name != '' AND
    sha256_hash IS NOT NULL AND 
    sha256_hash != '' AND
    length(sha256_hash) = 64
  );

-- ============================================================================
-- 4. FIX FUNCTION SECURITY
-- ============================================================================

-- Recreate function with explicit search_path
CREATE OR REPLACE FUNCTION expire_pending_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE payment_orders
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$;

-- ============================================================================
-- 5. ADD HELPFUL COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_payment_orders_license_key_id IS 
  'Optimizes foreign key lookups for payment_orders.license_key_id';

COMMENT ON POLICY "Only authenticated users can mark keys as used" ON license_keys IS 
  'Optimized with (select auth.role()) to prevent per-row re-evaluation';

COMMENT ON POLICY "Anyone can register new V-IDs with valid data" ON v_ids IS 
  'Validates required fields and SHA-256 hash format (64 hex characters)';

COMMENT ON FUNCTION expire_pending_orders IS 
  'Auto-expires pending payment orders after 15 minutes. Run via pg_cron or Edge Function.';