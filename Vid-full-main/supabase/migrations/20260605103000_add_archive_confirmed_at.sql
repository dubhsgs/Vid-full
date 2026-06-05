ALTER TABLE public.v_ids
  ADD COLUMN IF NOT EXISTS archive_confirmed_at timestamptz;

COMMENT ON COLUMN public.v_ids.archive_confirmed_at IS
  'Time when the VAID archive proof was confirmed by the archive verification flow.';

UPDATE public.v_ids
SET archive_confirmed_at = updated_at
WHERE ots_status = 'confirmed'
  AND archive_confirmed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v_ids_archive_confirmed_at
  ON public.v_ids(archive_confirmed_at)
  WHERE archive_confirmed_at IS NOT NULL;
