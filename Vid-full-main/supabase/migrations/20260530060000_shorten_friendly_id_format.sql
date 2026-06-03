-- Shorten new public Record IDs to a 3-3-3 format, e.g. VG4-PFU-VZA.
-- Existing friendly_id values remain valid and unchanged.

CREATE OR REPLACE FUNCTION public.generate_v_id_friendly_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  raw_id text;
  candidate text;
  i integer;
BEGIN
  LOOP
    raw_id := 'V';

    FOR i IN 1..8 LOOP
      raw_id := raw_id || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    END LOOP;

    candidate := substr(raw_id, 1, 3) || '-' || substr(raw_id, 4, 3) || '-' || substr(raw_id, 7, 3);

    IF NOT EXISTS (
      SELECT 1 FROM public.v_ids AS v WHERE v.friendly_id = candidate
    ) THEN
      RETURN candidate;
    END IF;
  END LOOP;
END;
$$;
