-- Make the OTS worker endpoint configurable through Supabase Vault.
-- Optional Vault secret:
--   name: ots_worker_url
--   value: https://<project-ref>.supabase.co/functions/v1/ots-worker
--
-- The fallback keeps the current production project working until the secret is
-- configured. Set ots_worker_url before migrating this project to another
-- Supabase project.

CREATE OR REPLACE FUNCTION public.dispatch_ots_job_to_worker()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net
AS $$
DECLARE
  worker_secret text;
  worker_url text;
  request_id bigint;
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

  worker_url := coalesce(
    nullif(trim(worker_url), ''),
    'https://vimglsksvvvnxkjnaqeh.supabase.co/functions/v1/ots-worker'
  );

  IF worker_secret IS NULL OR length(trim(worker_secret)) = 0 THEN
    UPDATE public.ots_jobs
    SET status = 'failed',
        attempt_count = attempt_count + 1,
        last_error = 'OTS_WORKER_SECRET_NOT_CONFIGURED',
        updated_at = now()
    WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url := worker_url,
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'id', NEW.id,
        'friendly_id', NEW.friendly_id
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-VAID-Internal-Secret', worker_secret
    ),
    timeout_milliseconds := 10000
  ) INTO request_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  UPDATE public.ots_jobs
  SET status = 'failed',
      attempt_count = attempt_count + 1,
      last_error = left(SQLERRM, 500),
      updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_ots_job_to_worker() FROM PUBLIC;
