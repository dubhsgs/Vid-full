ALTER TABLE public.v_id_creator_identity_claims
  DROP CONSTRAINT IF EXISTS v_id_creator_identity_last4_check;

ALTER TABLE public.v_id_creator_identity_claims
  ADD CONSTRAINT v_id_creator_identity_last4_check
  CHECK (length(document_number_last4) BETWEEN 1 AND 4);
