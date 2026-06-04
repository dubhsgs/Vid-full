-- Schedule cleanup for abandoned original uploads.
-- Successful and failed registration attempts clean up immediately in v-id-register;
-- this cron is a fallback for users who upload and leave before registration.

CREATE OR REPLACE FUNCTION public.dispatch_original_upload_cleanup(
  p_max_age_hours integer DEFAULT 24,
  p_max_deletions integer DEFAULT 100
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net
AS $$
DECLARE
  worker_secret text;
  cleanup_url text;
  max_age_hours integer := greatest(1, least(coalesce(p_max_age_hours, 24), 168));
  max_deletions integer := greatest(1, least(coalesce(p_max_deletions, 100), 500));
BEGIN
  SELECT decrypted_secret
  INTO worker_secret
  FROM vault.decrypted_secrets
  WHERE name = 'ots_worker_secret'
  LIMIT 1;

  SELECT decrypted_secret
  INTO cleanup_url
  FROM vault.decrypted_secrets
  WHERE name = 'original_cleanup_url'
  LIMIT 1;

  cleanup_url := coalesce(
    nullif(trim(cleanup_url), ''),
    'https://vimglsksvvvnxkjnaqeh.supabase.co/functions/v1/original-cleanup'
  );

  IF worker_secret IS NULL OR length(trim(worker_secret)) = 0 THEN
    RETURN 0;
  END IF;

  PERFORM net.http_post(
    url := cleanup_url,
    body := jsonb_build_object(
      'max_age_hours', max_age_hours,
      'max_deletions', max_deletions
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-VAID-Internal-Secret', worker_secret
    ),
    timeout_milliseconds := 10000
  );

  RETURN 1;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_original_upload_cleanup(integer, integer) FROM PUBLIC;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('vaid-original-upload-cleanup');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'vaid-original-upload-cleanup',
  '17 */6 * * *',
  $$SELECT public.dispatch_original_upload_cleanup(24, 100);$$
);
