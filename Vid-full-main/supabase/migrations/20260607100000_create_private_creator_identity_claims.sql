-- Private creator identity claims. These records must never be exposed through
-- public verification views or anonymous API access.

CREATE TABLE IF NOT EXISTS public.v_id_creator_identity_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  v_id_id uuid NOT NULL UNIQUE REFERENCES public.v_ids(id) ON DELETE CASCADE,
  friendly_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_region text NOT NULL,
  document_type text NOT NULL,
  document_number_encrypted text NOT NULL,
  document_number_last4 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT v_id_creator_identity_country_check
    CHECK (length(trim(country_region)) BETWEEN 2 AND 100),
  CONSTRAINT v_id_creator_identity_type_check
    CHECK (document_type IN ('national_id', 'passport', 'driver_license', 'other')),
  CONSTRAINT v_id_creator_identity_ciphertext_check
    CHECK (length(document_number_encrypted) BETWEEN 20 AND 2000),
  CONSTRAINT v_id_creator_identity_last4_check
    CHECK (length(document_number_last4) BETWEEN 2 AND 4)
);

CREATE INDEX IF NOT EXISTS idx_v_id_creator_identity_user_created
  ON public.v_id_creator_identity_claims(user_id, created_at DESC);

ALTER TABLE public.v_id_creator_identity_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own creator identity claims"
  ON public.v_id_creator_identity_claims;
CREATE POLICY "Users can view own creator identity claims"
  ON public.v_id_creator_identity_claims
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.v_id_creator_identity_claims FROM anon;
GRANT SELECT ON public.v_id_creator_identity_claims TO authenticated;
GRANT ALL ON public.v_id_creator_identity_claims TO service_role;

COMMENT ON TABLE public.v_id_creator_identity_claims IS
  'Private creator identity claims for creator, lawyer, or court use. Never expose through public verification.';

COMMENT ON COLUMN public.v_id_creator_identity_claims.document_number_encrypted IS
  'AES-GCM encrypted document number. Plaintext must never be stored.';
