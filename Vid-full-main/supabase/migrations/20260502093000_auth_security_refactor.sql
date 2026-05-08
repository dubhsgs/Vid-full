-- VAID Auth + Security Refactor Migration
-- Date: 2026-05-02
-- Status: LOCAL CANDIDATE MIGRATION. REVIEW BEFORE PRODUCTION DEPLOYMENT.
-- Local migration file; do not run against production until Edge Functions and frontend cutover are ready.
-- Purpose: executable SQL candidate for moving VAID from client_id/frontend-write architecture
--          to Supabase Auth + backend-controlled certificate registration.

-- ============================================================
-- 0. REQUIRED EXTENSIONS / NOTES
-- ============================================================

-- Supabase usually has pgcrypto available. Keep this idempotent.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Important production process:
-- 1. Run production schema precheck before applying any real migration.
-- 2. Confirm existing v_ids/alipay_orders/license_keys columns match assumptions.
-- 3. Back up production database or create a rollback plan.
-- 4. Apply in a maintenance window if possible.
-- 5. Deploy Edge Functions and frontend cutover in the correct order.
-- 6. Final product decisions for this migration:
--    - public_v_ids includes image_url.
--    - sha256_hash is public and must mean original uploaded file byte hash.
--    - free credits are available only after email confirmation.
--    - in-site Alipay payment directly adds account paid credits.
--    - activation codes remain only as redeemable gift/offline/distribution codes.
--    - OTS webhook should listen to ots_jobs inserts, not raw v_ids inserts.
--    - legacy records can be claimed only by proving matching original file hash.

-- ============================================================
-- 1. AUTH-OWNED PROFILE AND CREDIT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are readable by owner" ON public.profiles;
CREATE POLICY "Profiles are readable by owner"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles are updateable by owner" ON public.profiles;
CREATE POLICY "Profiles are updateable by owner"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  free_credits integer NOT NULL DEFAULT 0,
  paid_credits integer NOT NULL DEFAULT 0,
  total_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_credits_free_non_negative CHECK (free_credits >= 0),
  CONSTRAINT user_credits_paid_non_negative CHECK (paid_credits >= 0),
  CONSTRAINT user_credits_total_used_non_negative CHECK (total_used >= 0)
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own credits" ON public.user_credits;
CREATE POLICY "Users can read own credits"
  ON public.user_credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No direct INSERT/UPDATE/DELETE policies for authenticated users.
-- Mutations should happen through SECURITY DEFINER RPCs / service-role Edge Functions only.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_create_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Optional backfill for existing auth users after Auth is enabled.
INSERT INTO public.profiles (id, email)
SELECT id, email
FROM auth.users
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = now();

-- Optional backfill credits only for already-confirmed users.
INSERT INTO public.user_credits (user_id, free_credits, paid_credits, total_used)
SELECT id, 3, 0, 0
FROM auth.users
WHERE email_confirmed_at IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 2. v_ids OWNERSHIP + PUBLIC VIEW
-- ============================================================

ALTER TABLE public.v_ids
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_v_ids_user_id ON public.v_ids(user_id);
CREATE INDEX IF NOT EXISTS idx_v_ids_user_created_at ON public.v_ids(user_id, created_at DESC);

-- Legacy records have user_id NULL. They remain publicly verifiable but not account-owned.
COMMENT ON COLUMN public.v_ids.user_id IS
  'Owner user id for new Auth-based certificates. NULL means legacy public verification record.';

-- Replace direct public table access with a restricted public view.
-- This view intentionally exposes only verification-safe fields.
-- Product decision: image_url and full sha256_hash are public verification fields.
-- Security decision: sha256_hash must represent the original uploaded file bytes.
-- Do not store signed/private Storage URLs here; use public certificate image URLs only.
DROP VIEW IF EXISTS public.public_v_ids;
CREATE VIEW public.public_v_ids AS
SELECT
  friendly_id,
  character_name,
  creator_name,
  sha256_hash,
  image_url,
  created_at,
  ots_status,
  ots_file_path
FROM public.v_ids
WHERE friendly_id IS NOT NULL;

COMMENT ON VIEW public.public_v_ids IS
  'Public verification view for VAID certificates. Includes public image_url and original-file sha256_hash. Do not add user_id, payment fields, client_id, or private audit fields.';

GRANT SELECT ON public.public_v_ids TO anon, authenticated;

-- Lock down direct v_ids table access.
DROP POLICY IF EXISTS "Anyone can view registered V-IDs" ON public.v_ids;
DROP POLICY IF EXISTS "Anyone can register new V-IDs" ON public.v_ids;
DROP POLICY IF EXISTS "Anyone can register new V-IDs with valid data" ON public.v_ids;
DROP POLICY IF EXISTS "Users can view own v_ids" ON public.v_ids;

ALTER TABLE public.v_ids ENABLE ROW LEVEL SECURITY;

-- Authenticated users may read their own full records.
CREATE POLICY "Users can view own v_ids"
  ON public.v_ids
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No public/authenticated INSERT/UPDATE/DELETE policy.
-- Certificate creation and OTS updates must go through backend-controlled RPC/functions.
REVOKE INSERT, UPDATE, DELETE ON public.v_ids FROM anon, authenticated;
REVOKE SELECT ON public.v_ids FROM anon;
GRANT SELECT ON public.v_ids TO authenticated;

-- ============================================================
-- 3. OTS JOB QUEUE
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ots_job_status'
  ) THEN
    CREATE TYPE public.ots_job_status AS ENUM ('pending', 'processing', 'stamped', 'failed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ots_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  friendly_id text NOT NULL REFERENCES public.v_ids(friendly_id) ON DELETE CASCADE,
  status public.ots_job_status NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text,
  locked_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ots_jobs_attempt_count_non_negative CHECK (attempt_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ots_jobs_status_created_at ON public.ots_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_ots_jobs_friendly_id ON public.ots_jobs(friendly_id);

ALTER TABLE public.ots_jobs ENABLE ROW LEVEL SECURITY;

-- No public access. Service role / security-definer functions only.
REVOKE ALL ON public.ots_jobs FROM anon, authenticated;

-- First-version OTS trigger strategy:
-- Configure a Supabase Database Webhook on INSERT into public.ots_jobs.
-- The webhook should call the OTS worker Edge Function.
-- The worker must load sha256_hash from public.v_ids by friendly_id.
-- Add a scheduled retry job later for failed jobs and stale pending/processing jobs.

-- ============================================================
-- 4. FRIENDLY ID HELPER
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_v_id_friendly_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  part text;
  i integer;
  j integer;
BEGIN
  LOOP
    candidate := 'V';

    FOR i IN 1..3 LOOP
      part := '';
      FOR j IN 1..4 LOOP
        part := part || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
      END LOOP;
      candidate := candidate || CASE WHEN i = 1 THEN '' ELSE '-' END || part;
    END LOOP;

    IF NOT EXISTS (
      SELECT 1 FROM public.v_ids AS v WHERE v.friendly_id = candidate
    ) THEN
      RETURN candidate;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- 5. ATOMIC CERTIFICATE REGISTRATION RPC
-- ============================================================

DROP FUNCTION IF EXISTS public.register_v_id(uuid, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.register_v_id(uuid, text, text, text, text);

CREATE FUNCTION public.register_v_id(
  p_user_id uuid,
  p_character_name text,
  p_creator_name text,
  p_sha256_hash text,
  p_image_url text
)
RETURNS TABLE(
  result_status text,
  friendly_id text,
  free_credits integer,
  paid_credits integer,
  total_used integer,
  credit_consumed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  credit_row public.user_credits%ROWTYPE;
  existing_row public.v_ids%ROWTYPE;
  inserted_row public.v_ids%ROWTYPE;
  next_friendly_id text;
  normalized_sha256 text;
  confirmed_at timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT au.email_confirmed_at
  INTO confirmed_at
  FROM auth.users AS au
  WHERE au.id = p_user_id;

  IF confirmed_at IS NULL THEN
    RAISE EXCEPTION 'EMAIL_NOT_CONFIRMED';
  END IF;

  IF length(trim(coalesce(p_character_name, ''))) = 0 THEN
    RAISE EXCEPTION 'CHARACTER_NAME_REQUIRED';
  END IF;

  IF length(trim(coalesce(p_creator_name, ''))) = 0 THEN
    RAISE EXCEPTION 'CREATOR_NAME_REQUIRED';
  END IF;

  normalized_sha256 := lower(trim(coalesce(p_sha256_hash, '')));
  IF normalized_sha256 !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'INVALID_SHA256_HASH';
  END IF;

  IF length(trim(coalesce(p_image_url, ''))) = 0 THEN
    RAISE EXCEPTION 'IMAGE_URL_REQUIRED';
  END IF;

  -- If the hash already exists, return the existing public id without consuming credits.
  SELECT *
  INTO existing_row
  FROM public.v_ids AS v
  WHERE v.sha256_hash = normalized_sha256;

  IF FOUND THEN
    result_status := 'duplicate';
    friendly_id := existing_row.friendly_id;

    SELECT *
    INTO credit_row
    FROM public.user_credits AS uc
    WHERE uc.user_id = p_user_id;

    free_credits := coalesce(credit_row.free_credits, 0);
    paid_credits := coalesce(credit_row.paid_credits, 0);
    total_used := coalesce(credit_row.total_used, 0);
    credit_consumed := false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Lock the credit row to prevent concurrent over-consumption.
  SELECT *
  INTO credit_row
  FROM public.user_credits AS uc
  WHERE uc.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Free credits are created lazily only after email confirmation.
    INSERT INTO public.user_credits (user_id, free_credits, paid_credits, total_used)
    VALUES (p_user_id, 3, 0, 0)
    RETURNING * INTO credit_row;
  END IF;

  IF credit_row.free_credits <= 0 AND credit_row.paid_credits <= 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  IF credit_row.free_credits > 0 THEN
    UPDATE public.user_credits AS uc
    SET free_credits = uc.free_credits - 1,
        total_used = uc.total_used + 1,
        updated_at = now()
    WHERE uc.user_id = p_user_id
    RETURNING * INTO credit_row;
  ELSE
    UPDATE public.user_credits AS uc
    SET paid_credits = uc.paid_credits - 1,
        total_used = uc.total_used + 1,
        updated_at = now()
    WHERE uc.user_id = p_user_id
    RETURNING * INTO credit_row;
  END IF;

  next_friendly_id := public.generate_v_id_friendly_id();

  INSERT INTO public.v_ids (
    user_id,
    friendly_id,
    character_name,
    creator_name,
    sha256_hash,
    original_file_hash,
    image_url,
    ots_status
  )
  VALUES (
    p_user_id,
    next_friendly_id,
    trim(p_character_name),
    trim(p_creator_name),
    normalized_sha256,
    normalized_sha256,
    trim(p_image_url),
    'pending'
  )
  RETURNING * INTO inserted_row;

  INSERT INTO public.ots_jobs (friendly_id, status)
  VALUES (inserted_row.friendly_id, 'pending');

  result_status := 'created';
  friendly_id := inserted_row.friendly_id;
  free_credits := credit_row.free_credits;
  paid_credits := credit_row.paid_credits;
  total_used := credit_row.total_used;
  credit_consumed := true;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.register_v_id(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_v_id(uuid, text, text, text, text) TO service_role;

-- ============================================================
-- 6. LEGACY V-ID CLAIMING BY ORIGINAL FILE HASH
-- ============================================================

CREATE TABLE IF NOT EXISTS public.v_id_claim_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  friendly_id text NOT NULL,
  claimed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sha256_hash text NOT NULL,
  success boolean NOT NULL,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v_id_claim_audit_friendly_id
  ON public.v_id_claim_audit(friendly_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_v_id_claim_audit_user_id
  ON public.v_id_claim_audit(claimed_by_user_id, created_at DESC);

ALTER TABLE public.v_id_claim_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.v_id_claim_audit FROM anon, authenticated;

DROP FUNCTION IF EXISTS public.claim_legacy_v_id(uuid, text, text);

CREATE FUNCTION public.claim_legacy_v_id(
  p_user_id uuid,
  p_friendly_id text,
  p_sha256_hash text
)
RETURNS TABLE(
  claimed boolean,
  friendly_id text,
  failure_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_row public.v_ids%ROWTYPE;
  normalized_friendly_id text;
  normalized_sha256 text;
  confirmed_at timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT au.email_confirmed_at
  INTO confirmed_at
  FROM auth.users AS au
  WHERE au.id = p_user_id;

  IF confirmed_at IS NULL THEN
    RAISE EXCEPTION 'EMAIL_NOT_CONFIRMED';
  END IF;

  normalized_friendly_id := upper(trim(coalesce(p_friendly_id, '')));
  normalized_sha256 := lower(trim(coalesce(p_sha256_hash, '')));

  IF normalized_friendly_id = '' OR normalized_sha256 !~ '^[0-9a-f]{64}$' THEN
    INSERT INTO public.v_id_claim_audit (friendly_id, claimed_by_user_id, sha256_hash, success, failure_reason)
    VALUES (normalized_friendly_id, p_user_id, normalized_sha256, false, 'INVALID_INPUT');

    claimed := false;
    friendly_id := normalized_friendly_id;
    failure_reason := 'INVALID_INPUT';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT *
  INTO target_row
  FROM public.v_ids AS v
  WHERE v.friendly_id = normalized_friendly_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.v_id_claim_audit (friendly_id, claimed_by_user_id, sha256_hash, success, failure_reason)
    VALUES (normalized_friendly_id, p_user_id, normalized_sha256, false, 'NOT_FOUND');

    claimed := false;
    friendly_id := normalized_friendly_id;
    failure_reason := 'NOT_FOUND';
    RETURN NEXT;
    RETURN;
  END IF;

  IF target_row.user_id IS NOT NULL THEN
    INSERT INTO public.v_id_claim_audit (friendly_id, claimed_by_user_id, sha256_hash, success, failure_reason)
    VALUES (normalized_friendly_id, p_user_id, normalized_sha256, false, 'ALREADY_CLAIMED');

    claimed := false;
    friendly_id := normalized_friendly_id;
    failure_reason := 'ALREADY_CLAIMED';
    RETURN NEXT;
    RETURN;
  END IF;

  IF lower(target_row.sha256_hash) <> normalized_sha256 THEN
    INSERT INTO public.v_id_claim_audit (friendly_id, claimed_by_user_id, sha256_hash, success, failure_reason)
    VALUES (normalized_friendly_id, p_user_id, normalized_sha256, false, 'HASH_MISMATCH');

    claimed := false;
    friendly_id := normalized_friendly_id;
    failure_reason := 'HASH_MISMATCH';
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.v_ids AS v
  SET user_id = p_user_id,
      updated_at = now()
  WHERE v.id = target_row.id;

  INSERT INTO public.v_id_claim_audit (friendly_id, claimed_by_user_id, sha256_hash, success)
  VALUES (normalized_friendly_id, p_user_id, normalized_sha256, true);

  claimed := true;
  friendly_id := normalized_friendly_id;
  failure_reason := null;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_legacy_v_id(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_legacy_v_id(uuid, text, text) TO service_role;

-- Edge Function requirement:
-- claim-vid must verify the uploaded original file hash server-side or with a trusted upload proof,
-- then pass the verified hash to this RPC. Knowing friendly_id alone is never proof of ownership.

-- ============================================================
-- 7. ALIPAY ORDER OWNERSHIP AND CREDIT SETTLEMENT DRAFT
-- ============================================================

ALTER TABLE public.alipay_orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_alipay_orders_user_id ON public.alipay_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_alipay_orders_user_created_at ON public.alipay_orders(user_id, created_at DESC);

DROP POLICY IF EXISTS "Anon can view own orders by client_id header" ON public.alipay_orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.alipay_orders;
DROP POLICY IF EXISTS "Users can view own alipay orders" ON public.alipay_orders;

CREATE POLICY "Users can view own alipay orders"
  ON public.alipay_orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Order creation and settlement should happen via service-role Edge Functions.
-- Do not grant direct public mutation access.
REVOKE INSERT, UPDATE, DELETE ON public.alipay_orders FROM anon, authenticated;
REVOKE SELECT ON public.alipay_orders FROM anon;
GRANT SELECT ON public.alipay_orders TO authenticated;

-- Future replacement for mark_alipay_order_paid after payment model changes from license-key delivery
-- to direct account credit top-up.
-- This is intentionally named differently in the draft to avoid accidental replacement before frontend/functions are updated.
DROP FUNCTION IF EXISTS public.mark_alipay_order_paid_to_credits(text, text, timestamptz);

CREATE FUNCTION public.mark_alipay_order_paid_to_credits(
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
  ON CONFLICT (user_id) DO UPDATE
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

-- ============================================================
-- 8. ACTIVATION CODE REDEMPTION INTO ACCOUNT CREDITS
-- ============================================================

ALTER TABLE public.license_keys
  ADD COLUMN IF NOT EXISTS redeemed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS redeemed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_license_keys_redeemed_by_user_id
  ON public.license_keys(redeemed_by_user_id)
  WHERE redeemed_by_user_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.redeem_license_key_to_credits(text, uuid);

CREATE FUNCTION public.redeem_license_key_to_credits(
  p_key text,
  p_user_id uuid
)
RETURNS TABLE(
  redeemed boolean,
  added_credits integer,
  paid_credits integer,
  key_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  license_row public.license_keys%ROWTYPE;
  credit_row public.user_credits%ROWTYPE;
  confirmed_at timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT au.email_confirmed_at
  INTO confirmed_at
  FROM auth.users AS au
  WHERE au.id = p_user_id;

  IF confirmed_at IS NULL THEN
    RAISE EXCEPTION 'EMAIL_NOT_CONFIRMED';
  END IF;

  SELECT *
  INTO license_row
  FROM public.license_keys AS lk
  WHERE lk.key = upper(trim(p_key))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF license_row.status <> 'active'
     OR license_row.remaining_uses <= 0
     OR license_row.redeemed_by_user_id IS NOT NULL THEN
    redeemed := false;
    added_credits := 0;
    paid_credits := 0;
    key_status := coalesce(license_row.status, 'unavailable');
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.user_credits (user_id, free_credits, paid_credits, total_used)
  VALUES (p_user_id, 3, license_row.remaining_uses, 0)
  ON CONFLICT (user_id) DO UPDATE
    SET paid_credits = public.user_credits.paid_credits + EXCLUDED.paid_credits,
        updated_at = now()
  RETURNING * INTO credit_row;

  UPDATE public.license_keys AS lk
  SET redeemed_by_user_id = p_user_id,
      redeemed_at = now(),
      remaining_uses = 0,
      used = true,
      status = 'exhausted',
      last_used_at = now()
  WHERE lk.id = license_row.id;

  redeemed := true;
  added_credits := license_row.remaining_uses;
  paid_credits := credit_row.paid_credits;
  key_status := 'redeemed';
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_license_key_to_credits(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_license_key_to_credits(text, uuid) TO service_role;

-- ============================================================
-- 9. STORAGE POLICY DRAFT FOR AUTH-OWNED UPLOADS
-- ============================================================

-- Product decision: certificate image_url is public for verification UX.
-- Existing bucket can remain public for read, or a dedicated public certificate-image bucket can be used.
-- Do not write signed/private Storage URLs into v_ids.image_url because signed URLs expire.
-- Uploads should no longer be anonymous. New object path convention:
-- avatars/{user_id}/{uuid}.jpg

DROP POLICY IF EXISTS "Anon can upload to avatars path only" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar images" ON storage.objects;

CREATE POLICY "Users can upload own avatar images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'v-id-images'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can read own avatar images" ON storage.objects;
CREATE POLICY "Users can read own avatar images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'v-id-images'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Keep existing public read policy for verification images.
-- Keep private/internal upload paths out of public_v_ids.

-- ============================================================
-- 10. TODO BEFORE REAL MIGRATION
-- ============================================================

-- DECIDED: public_v_ids includes public certificate image_url.
-- DECIDED: sha256_hash is fully public and means original file byte hash.
-- DECIDED: license_keys stay for gift/offline/distribution redemption into account credits.
-- IMPLEMENTED LOCALLY: alipay-create-order now requires Auth and writes alipay_orders.user_id.
-- IMPLEMENTED LOCALLY: alipay-query-order now requires Auth, checks order ownership, and returns no license_key.
-- IMPLEMENTED LOCALLY: frontend VerifyPage reads from public_v_ids.
-- IMPLEMENTED LOCALLY: CardGenerator/App generation flow uses v-id-register and Auth gating.
-- IMPLEMENTED LOCALLY: image upload path uses avatars/{user_id}/{filename} when signed in.
-- TODO: Configure Database Webhook on ots_jobs INSERT to call OTS worker.
-- TODO: Add a scheduled retry for failed/stale OTS jobs.
-- IMPLEMENTED LOCALLY: claim-vid Edge Function computes original-file hash server-side and calls claim_legacy_v_id.
-- TODO: Add production migration rollback plan.
