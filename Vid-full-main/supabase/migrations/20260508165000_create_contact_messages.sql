-- Store website contact form submissions without exposing the owner's email address.
-- Public users cannot read or write this table directly; only the Edge Function
-- inserts through service_role.

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  reply_email text NOT NULL CHECK (char_length(trim(reply_email)) BETWEEN 3 AND 320),
  message text NOT NULL CHECK (char_length(trim(message)) BETWEEN 1 AND 4000),
  page_url text,
  language text,
  user_agent text,
  delivery_status text NOT NULL DEFAULT 'stored' CHECK (delivery_status IN ('stored', 'sent', 'send_failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.contact_messages FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.contact_messages TO service_role;
