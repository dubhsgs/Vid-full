-- Private creator evidence materials.
-- Public verification must not expose these records or uploaded source files.

CREATE TABLE IF NOT EXISTS public.v_id_evidence_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  v_id_id uuid NOT NULL REFERENCES public.v_ids(id) ON DELETE CASCADE,
  friendly_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_type text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes bigint NOT NULL,
  sha256_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT v_id_evidence_materials_type_check
    CHECK (material_type IN ('video', 'image', 'pdf')),
  CONSTRAINT v_id_evidence_materials_file_name_check
    CHECK (
      length(trim(file_name)) BETWEEN 1 AND 240
      AND file_name !~ '[\\/]'
    ),
  CONSTRAINT v_id_evidence_materials_file_size_check
    CHECK (file_size_bytes > 0 AND file_size_bytes <= 314572800),
  CONSTRAINT v_id_evidence_materials_sha256_check
    CHECK (sha256_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT v_id_evidence_materials_unique_hash
    UNIQUE (v_id_id, sha256_hash)
);

CREATE INDEX IF NOT EXISTS idx_v_id_evidence_materials_user_created
  ON public.v_id_evidence_materials(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_v_id_evidence_materials_v_id_created
  ON public.v_id_evidence_materials(v_id_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_v_id_evidence_materials_friendly_id
  ON public.v_id_evidence_materials(friendly_id);

ALTER TABLE public.v_id_evidence_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own evidence materials" ON public.v_id_evidence_materials;
CREATE POLICY "Users can view own evidence materials"
  ON public.v_id_evidence_materials
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.v_id_evidence_materials FROM anon;
GRANT SELECT ON public.v_id_evidence_materials TO authenticated;
GRANT ALL ON public.v_id_evidence_materials TO service_role;

COMMENT ON TABLE public.v_id_evidence_materials IS
  'Private creator evidence material metadata. Original evidence files are temporary and must not be exposed on public verification pages.';

COMMENT ON COLUMN public.v_id_evidence_materials.sha256_hash IS
  'Server-computed SHA-256 hash of the uploaded evidence material.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'v-id-evidence-temp',
  'v-id-evidence-temp',
  false,
  314572800,
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can upload own temporary evidence materials" ON storage.objects;
CREATE POLICY "Users can upload own temporary evidence materials"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'v-id-evidence-temp'
    AND (storage.foldername(name))[1] = 'evidence'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own temporary evidence materials" ON storage.objects;
CREATE POLICY "Users can delete own temporary evidence materials"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'v-id-evidence-temp'
    AND (storage.foldername(name))[1] = 'evidence'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Service role can manage temporary evidence materials" ON storage.objects;
CREATE POLICY "Service role can manage temporary evidence materials"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'v-id-evidence-temp')
  WITH CHECK (bucket_id = 'v-id-evidence-temp');

CREATE OR REPLACE FUNCTION public.dispatch_evidence_material_cleanup(
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
  request_id bigint;
BEGIN
  SELECT decrypted_secret
  INTO worker_secret
  FROM vault.decrypted_secrets
  WHERE name = 'ots_worker_secret'
  LIMIT 1;

  SELECT decrypted_secret
  INTO cleanup_url
  FROM vault.decrypted_secrets
  WHERE name = 'evidence_cleanup_url'
  LIMIT 1;

  cleanup_url := coalesce(
    nullif(trim(cleanup_url), ''),
    'https://vimglsksvvvnxkjnaqeh.supabase.co/functions/v1/evidence-cleanup'
  );

  IF worker_secret IS NULL OR length(trim(worker_secret)) = 0 THEN
    RETURN 0;
  END IF;

  SELECT net.http_post(
    url := cleanup_url,
    body := jsonb_build_object(
      'max_age_hours', greatest(1, least(coalesce(p_max_age_hours, 24), 168)),
      'max_deletions', greatest(1, least(coalesce(p_max_deletions, 100), 500))
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-VAID-Internal-Secret', worker_secret
    ),
    timeout_milliseconds := 10000
  )
  INTO request_id;

  RETURN coalesce(request_id, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_evidence_material_cleanup(integer, integer) FROM PUBLIC;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('vaid-evidence-material-cleanup');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'vaid-evidence-material-cleanup',
  '17 */6 * * *',
  $$SELECT public.dispatch_evidence_material_cleanup(24, 100);$$
);
