-- Add a privacy-preserving client hash for contact form rate limiting.

ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS client_ip_hash text;

CREATE INDEX IF NOT EXISTS idx_contact_messages_ip_hash_created_at
  ON public.contact_messages (client_ip_hash, created_at DESC)
  WHERE client_ip_hash IS NOT NULL;
