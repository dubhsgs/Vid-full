-- Disable Supabase Storage as the direct upload path for creator evidence materials.
-- Evidence files will move to Cloudflare R2; Supabase should keep metadata only.

DROP POLICY IF EXISTS "Users can upload own temporary evidence materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own temporary evidence materials" ON storage.objects;

UPDATE storage.buckets
SET public = false,
    file_size_limit = 1,
    allowed_mime_types = ARRAY[]::text[]
WHERE id = 'v-id-evidence-temp';

COMMENT ON TABLE public.v_id_evidence_materials IS
  'Private creator evidence material metadata. Original evidence files are not stored in Supabase Storage; large evidence files should use the configured private object storage provider.';
