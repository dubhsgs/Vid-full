CREATE OR REPLACE FUNCTION public.register_v_id(
  p_user_id uuid,
  p_character_name text,
  p_creator_name text,
  p_sha256_hash text,
  p_image_url text
)
RETURNS TABLE(
  result_status text,
  friendly_id text,
  free_credits integer,
  paid_credits integer,
  total_used integer,
  credit_consumed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  credit_row public.user_credits%ROWTYPE;
  existing_row public.v_ids%ROWTYPE;
  inserted_row public.v_ids%ROWTYPE;
  next_friendly_id text;
  normalized_sha256 text;
  confirmed_at timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT au.email_confirmed_at
  INTO confirmed_at
  FROM auth.users AS au
  WHERE au.id = p_user_id;

  IF confirmed_at IS NULL THEN
    RAISE EXCEPTION 'EMAIL_NOT_CONFIRMED';
  END IF;

  IF length(trim(coalesce(p_character_name, ''))) = 0 THEN
    RAISE EXCEPTION 'CHARACTER_NAME_REQUIRED';
  END IF;

  IF length(trim(coalesce(p_creator_name, ''))) = 0 THEN
    RAISE EXCEPTION 'CREATOR_NAME_REQUIRED';
  END IF;

  normalized_sha256 := lower(trim(coalesce(p_sha256_hash, '')));
  IF normalized_sha256 !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'INVALID_SHA256_HASH';
  END IF;

  IF length(trim(coalesce(p_image_url, ''))) = 0 THEN
    RAISE EXCEPTION 'IMAGE_URL_REQUIRED';
  END IF;

  SELECT *
  INTO existing_row
  FROM public.v_ids AS v
  WHERE v.sha256_hash = normalized_sha256;

  IF FOUND THEN
    IF existing_row.user_id IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'DUPLICATE_HASH_OWNED_BY_ANOTHER_USER';
    END IF;

    result_status := 'duplicate';
    friendly_id := existing_row.friendly_id;

    SELECT *
    INTO credit_row
    FROM public.user_credits AS uc
    WHERE uc.user_id = p_user_id;

    free_credits := coalesce(credit_row.free_credits, 0);
    paid_credits := coalesce(credit_row.paid_credits, 0);
    total_used := coalesce(credit_row.total_used, 0);
    credit_consumed := false;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT *
  INTO credit_row
  FROM public.user_credits AS uc
  WHERE uc.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR (credit_row.free_credits <= 0 AND credit_row.paid_credits <= 0) THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  IF credit_row.free_credits > 0 THEN
    UPDATE public.user_credits AS uc
    SET free_credits = uc.free_credits - 1,
        total_used = uc.total_used + 1,
        updated_at = now()
    WHERE uc.user_id = p_user_id
    RETURNING * INTO credit_row;
  ELSE
    UPDATE public.user_credits AS uc
    SET paid_credits = uc.paid_credits - 1,
        total_used = uc.total_used + 1,
        updated_at = now()
    WHERE uc.user_id = p_user_id
    RETURNING * INTO credit_row;
  END IF;

  next_friendly_id := public.generate_v_id_friendly_id();

  INSERT INTO public.v_ids (
    user_id,
    friendly_id,
    character_name,
    creator_name,
    sha256_hash,
    original_file_hash,
    image_url,
    ots_status
  )
  VALUES (
    p_user_id,
    next_friendly_id,
    trim(p_character_name),
    trim(p_creator_name),
    normalized_sha256,
    normalized_sha256,
    trim(p_image_url),
    'pending'
  )
  RETURNING * INTO inserted_row;

  INSERT INTO public.ots_jobs (friendly_id, status)
  VALUES (inserted_row.friendly_id, 'pending');

  result_status := 'created';
  friendly_id := inserted_row.friendly_id;
  free_credits := credit_row.free_credits;
  paid_credits := credit_row.paid_credits;
  total_used := credit_row.total_used;
  credit_consumed := true;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.register_v_id(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_v_id(uuid, text, text, text, text) TO service_role;
