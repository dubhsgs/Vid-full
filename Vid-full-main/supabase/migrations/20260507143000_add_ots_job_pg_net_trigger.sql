-- Auto-dispatch OTS jobs to the ots-worker Edge Function.
-- Secret value is stored in Supabase Vault under name `ots_worker_secret`.
-- Do not hardcode the secret in migrations.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.dispatch_ots_job_to_worker()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net
AS $$
DECLARE
  worker_secret text;
  request_id bigint;
BEGIN
  SELECT decrypted_secret
  INTO worker_secret
  FROM vault.decrypted_secrets
  WHERE name = 'ots_worker_secret'
  LIMIT 1;

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
    url := 'https://vimglsksvvvnxkjnaqeh.supabase.co/functions/v1/ots-worker',
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

DROP TRIGGER IF EXISTS trg_dispatch_ots_job_to_worker ON public.ots_jobs;
CREATE TRIGGER trg_dispatch_ots_job_to_worker
AFTER INSERT ON public.ots_jobs
FOR EACH ROW
EXECUTE FUNCTION public.dispatch_ots_job_to_worker();
