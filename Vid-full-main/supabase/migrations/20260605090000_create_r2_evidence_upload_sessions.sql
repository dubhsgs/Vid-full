-- R2-backed private evidence upload sessions.
-- Supabase keeps ownership, metadata and hashes; R2 only receives temporary originals.

CREATE TABLE IF NOT EXISTS public.v_id_evidence_upload_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  v_id_id uuid NOT NULL REFERENCES public.v_ids(id) ON DELETE CASCADE,
  friendly_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE,
  file_name text NOT NULL,
  declared_mime_type text NOT NULL,
  declared_size_bytes bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT v_id_evidence_upload_sessions_status_check
    CHECK (status IN ('pending', 'completed', 'abandoned')),
  CONSTRAINT v_id_evidence_upload_sessions_file_name_check
    CHECK (
      length(trim(file_name)) BETWEEN 1 AND 240
      AND file_name !~ '[\\/]'
    ),
  CONSTRAINT v_id_evidence_upload_sessions_size_check
    CHECK (declared_size_bytes > 0 AND declared_size_bytes <= 314572800),
  CONSTRAINT v_id_evidence_upload_sessions_mime_check
    CHECK (
      declared_mime_type IN (
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/quicktime',
        'video/webm',
        'application/pdf'
      )
    ),
  CONSTRAINT v_id_evidence_upload_sessions_object_key_check
    CHECK (
      object_key ~ '^evidence/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}$'
    )
);

CREATE INDEX IF NOT EXISTS idx_v_id_evidence_upload_sessions_user_status
  ON public.v_id_evidence_upload_sessions(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_v_id_evidence_upload_sessions_pending_expiry
  ON public.v_id_evidence_upload_sessions(status, expires_at)
  WHERE status = 'pending';

ALTER TABLE public.v_id_evidence_upload_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own evidence upload sessions" ON public.v_id_evidence_upload_sessions;
CREATE POLICY "Users can view own evidence upload sessions"
  ON public.v_id_evidence_upload_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.v_id_evidence_upload_sessions FROM anon;
GRANT SELECT ON public.v_id_evidence_upload_sessions TO authenticated;
GRANT ALL ON public.v_id_evidence_upload_sessions TO service_role;

COMMENT ON TABLE public.v_id_evidence_upload_sessions IS
  'Private R2 upload sessions for creator evidence materials. Uploaded originals are temporary and should be deleted after metadata registration or expiry.';

COMMENT ON COLUMN public.v_id_evidence_materials.sha256_hash IS
  'SHA-256 hash of the evidence material provided by the client upload flow. Users must keep the original material file for later verification.';
