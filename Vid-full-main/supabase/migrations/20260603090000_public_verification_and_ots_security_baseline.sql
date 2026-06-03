-- Security baseline:
-- 1. Keep public verification useful, but stop exposing internal proof fields.
-- 2. Store future OTS proof files in a private bucket.
-- 3. Schedule backend OTS retry and confirmation maintenance.

DROP VIEW IF EXISTS public.public_v_ids;
CREATE VIEW public.public_v_ids AS
SELECT
  friendly_id,
  character_name,
  creator_name,
  image_url,
  created_at,
  ots_status
FROM public.v_ids
WHERE friendly_id IS NOT NULL;

COMMENT ON VIEW public.public_v_ids IS
  'Public verification view for VAID records. Do not expose sha256_hash, ots_file_path, user_id, payment fields, client_id, or private audit fields.';

GRANT SELECT ON public.public_v_ids TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'v-id-ots',
  'v-id-ots',
  false,
  1048576,
  ARRAY['application/octet-stream']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read access for v-id-images'
  ) THEN
    ALTER POLICY "Public read access for v-id-images"
      ON storage.objects
      TO public
      USING (
        bucket_id = 'v-id-images'
        AND (storage.foldername(name))[1] = 'avatars'
      );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read avatar and ots files'
  ) THEN
    ALTER POLICY "Public read avatar and ots files"
      ON storage.objects
      TO public
      USING (
        bucket_id = 'v-id-images'
        AND (storage.foldername(name))[1] = 'avatars'
      );
  END IF;
END $$;

DROP POLICY IF EXISTS "Service role can manage OTS proof files" ON storage.objects;
CREATE POLICY "Service role can manage OTS proof files"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'v-id-ots')
  WITH CHECK (bucket_id = 'v-id-ots');

CREATE INDEX IF NOT EXISTS idx_v_ids_ots_status_updated_at
  ON public.v_ids(ots_status, updated_at);

CREATE OR REPLACE FUNCTION public.dispatch_ots_maintenance(
  p_batch_size integer DEFAULT 10
)
RETURNS TABLE(worker_requests integer, verify_requests integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net
AS $$
DECLARE
  worker_secret text;
  worker_url text;
  verify_url text;
  job_record record;
  v_id_record record;
  max_batch integer := greatest(1, least(coalesce(p_batch_size, 10), 50));
  worker_count integer := 0;
  verify_count integer := 0;
BEGIN
  SELECT decrypted_secret
  INTO worker_secret
  FROM vault.decrypted_secrets
  WHERE name = 'ots_worker_secret'
  LIMIT 1;

  SELECT decrypted_secret
  INTO worker_url
  FROM vault.decrypted_secrets
  WHERE name = 'ots_worker_url'
  LIMIT 1;

  SELECT decrypted_secret
  INTO verify_url
  FROM vault.decrypted_secrets
  WHERE name = 'ots_verify_url'
  LIMIT 1;

  worker_url := coalesce(
    nullif(trim(worker_url), ''),
    'https://vimglsksvvvnxkjnaqeh.supabase.co/functions/v1/ots-worker'
  );
  verify_url := coalesce(
    nullif(trim(verify_url), ''),
    'https://vimglsksvvvnxkjnaqeh.supabase.co/functions/v1/ots-verify'
  );

  IF worker_secret IS NOT NULL AND length(trim(worker_secret)) > 0 THEN
    FOR job_record IN
      SELECT id, friendly_id
      FROM public.ots_jobs
      WHERE attempt_count < 8
        AND (
          status IN ('pending', 'failed')
          OR (status = 'processing' AND updated_at < now() - interval '15 minutes')
        )
      ORDER BY updated_at ASC
      LIMIT max_batch
    LOOP
      PERFORM net.http_post(
        url := worker_url,
        body := jsonb_build_object(
          'record',
          jsonb_build_object('id', job_record.id, 'friendly_id', job_record.friendly_id)
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-VAID-Internal-Secret', worker_secret
        ),
        timeout_milliseconds := 10000
      );
      worker_count := worker_count + 1;
    END LOOP;
  END IF;

  IF worker_secret IS NOT NULL AND length(trim(worker_secret)) > 0 THEN
    FOR v_id_record IN
      SELECT friendly_id
      FROM public.v_ids
      WHERE ots_status = 'stamped'
        AND ots_file_path IS NOT NULL
        AND updated_at < now() - interval '30 minutes'
      ORDER BY updated_at ASC
      LIMIT max_batch
    LOOP
      PERFORM net.http_post(
        url := verify_url,
        body := jsonb_build_object('friendly_id', v_id_record.friendly_id),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-VAID-Internal-Secret', worker_secret
        ),
        timeout_milliseconds := 10000
      );
      verify_count := verify_count + 1;
    END LOOP;
  END IF;

  worker_requests := worker_count;
  verify_requests := verify_count;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_ots_maintenance(integer) FROM PUBLIC;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('vaid-ots-maintenance');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'vaid-ots-maintenance',
  '*/30 * * * *',
  $$SELECT public.dispatch_ots_maintenance(10);$$
);
