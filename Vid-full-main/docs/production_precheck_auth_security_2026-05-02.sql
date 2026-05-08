-- VAID production precheck for Auth/security refactor
-- Date: 2026-05-02
-- Purpose: read-only checks to run before applying
--          supabase/migrations/20260502093000_auth_security_refactor.sql.
--
-- Expected use:
-- 1. Run this against the target Supabase project before migration.
-- 2. Save the output with the deployment notes.
-- 3. Do not apply the migration if required tables/columns are missing or unexpected.

-- ============================================================
-- 1. Core table existence
-- ============================================================

SELECT
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_schema IN ('public', 'storage')
  AND table_name IN (
    'v_ids',
    'alipay_orders',
    'license_keys',
    'user_quotas',
    'objects'
  )
ORDER BY table_schema, table_name;

-- ============================================================
-- 2. Required v_ids columns before migration
-- ============================================================

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'v_ids'
  AND column_name IN (
    'id',
    'friendly_id',
    'character_name',
    'creator_name',
    'sha256_hash',
    'original_file_hash',
    'image_url',
    'ots_status',
    'ots_file_path',
    'created_at',
    'updated_at'
  )
ORDER BY ordinal_position;

-- Required result:
-- - v_ids exists.
-- - sha256_hash exists and is unique/indexed.
-- - friendly_id exists and is unique/indexed.
-- - original_file_hash, ots_status, ots_file_path exist from the OTS migration.
-- - updated_at exists because claim_legacy_v_id updates it.

-- ============================================================
-- 3. Required alipay_orders columns before migration
-- ============================================================

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'alipay_orders'
  AND column_name IN (
    'id',
    'out_trade_no',
    'trade_no',
    'client_id',
    'pack_size',
    'amount',
    'status',
    'paid_at',
    'created_at',
    'updated_at',
    'license_key'
  )
ORDER BY ordinal_position;

-- Required result:
-- - alipay_orders exists.
-- - client_id is still present and NOT NULL in old schema; new function temporarily stores user.id there for compatibility.
-- - pack_size supports 1, 5, 10 from the April payment migration.
-- - license_key may exist from the activation-code migration but will no longer be returned for in-site payment.

-- ============================================================
-- 4. Required license_keys columns before migration
-- ============================================================

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'license_keys'
  AND column_name IN (
    'id',
    'key',
    'pack_size',
    'used',
    'total_uses',
    'remaining_uses',
    'status',
    'last_used_at',
    'order_out_trade_no'
  )
ORDER BY ordinal_position;

-- Required result:
-- - license_keys exists.
-- - total_uses, remaining_uses, status, last_used_at, order_out_trade_no exist from activation-code migration.

-- ============================================================
-- 5. Existing policies that will be replaced or left in place
-- ============================================================

SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
  AND tablename IN ('v_ids', 'alipay_orders', 'license_keys', 'user_quotas', 'objects')
ORDER BY schemaname, tablename, policyname;

-- Required review:
-- - v_ids currently has public INSERT policy; migration removes it.
-- - alipay_orders currently has client_id-header or public-ish SELECT policy; migration replaces it with user_id ownership.
-- - storage.objects public read policy for the v-id-images bucket may remain if certificate image_url is public by product decision.

-- ============================================================
-- 6. Existing helper functions
-- ============================================================

SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'consume_user_credit',
    'mark_alipay_order_paid',
    'consume_license_key_use',
    'generate_license_key_code',
    'update_updated_at_column'
  )
ORDER BY function_name, args;

-- Required review:
-- - old functions may remain for rollback/legacy compatibility, but new deployed Edge Functions should use:
--   register_v_id
--   mark_alipay_order_paid_to_credits
--   redeem_license_key_to_credits
--   claim_legacy_v_id

-- ============================================================
-- 7. Existing data volume and legacy ownership estimate
-- ============================================================

SELECT 'v_ids_total' AS metric, count(*)::text AS value FROM public.v_ids
UNION ALL
SELECT 'v_ids_without_friendly_id', count(*)::text FROM public.v_ids WHERE friendly_id IS NULL
UNION ALL
SELECT 'v_ids_without_original_file_hash', count(*)::text FROM public.v_ids WHERE original_file_hash IS NULL
UNION ALL
SELECT 'alipay_orders_total', count(*)::text FROM public.alipay_orders
UNION ALL
SELECT 'alipay_orders_paid', count(*)::text FROM public.alipay_orders WHERE status = 'paid'
UNION ALL
SELECT 'license_keys_total', count(*)::text FROM public.license_keys
UNION ALL
SELECT 'license_keys_active', count(*)::text FROM public.license_keys WHERE status = 'active';

-- Required review:
-- - Old v_ids will have user_id NULL after migration and remain publicly verifiable through public_v_ids.
-- - Records without original_file_hash may not be claimable unless sha256_hash already represents the original file hash.

-- ============================================================
-- 8. Storage bucket check
-- ============================================================

SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'v-id-images';

-- Required result:
-- - v-id-images bucket exists.
-- - Product decision allows public certificate image URLs.
-- - Do not store expiring signed URLs in public_v_ids.image_url.

-- ============================================================
-- 9. Migration object collision check
-- ============================================================

SELECT 'profiles_table_exists' AS object_name, to_regclass('public.profiles')::text AS object_value
UNION ALL
SELECT 'user_credits_table_exists', to_regclass('public.user_credits')::text
UNION ALL
SELECT 'ots_jobs_table_exists', to_regclass('public.ots_jobs')::text
UNION ALL
SELECT 'v_id_claim_audit_table_exists', to_regclass('public.v_id_claim_audit')::text
UNION ALL
SELECT 'public_v_ids_view_exists', to_regclass('public.public_v_ids')::text;

-- Required review:
-- - If any object already exists in production, inspect it manually before applying the migration.
