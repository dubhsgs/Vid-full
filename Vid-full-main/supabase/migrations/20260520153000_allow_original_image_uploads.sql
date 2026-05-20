-- Allow authenticated users to upload original files for server-side hash verification.
-- Original files are not part of public verification output and are stored in a private bucket.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'application/octet-stream'
    ]
WHERE id = 'v-id-images';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read access for v-id-images'
  ) THEN
    ALTER POLICY "Public read access for v-id-images"
      ON storage.objects
      TO public
      USING (
        bucket_id = 'v-id-images'
        AND (storage.foldername(name))[1] IN ('avatars', 'ots')
      );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read avatar and ots files'
  ) THEN
    ALTER POLICY "Public read avatar and ots files"
      ON storage.objects
      TO public
      USING (
        bucket_id = 'v-id-images'
        AND (storage.foldername(name))[1] IN ('avatars', 'ots')
      );
  ELSE
    CREATE POLICY "Public read avatar and ots files"
      ON storage.objects
      FOR SELECT
      TO public
      USING (
        bucket_id = 'v-id-images'
        AND (storage.foldername(name))[1] IN ('avatars', 'ots')
      );
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'v-id-originals',
  'v-id-originals',
  false,
  8388608,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload own original images'
  ) THEN
    ALTER POLICY "Users can upload own original images"
      ON storage.objects
      TO authenticated
      WITH CHECK (
        bucket_id = 'v-id-originals'
        AND (storage.foldername(name))[1] = 'originals'
        AND (storage.foldername(name))[2] = auth.uid()::text
      );
  ELSE
    CREATE POLICY "Users can upload own original images"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'v-id-originals'
        AND (storage.foldername(name))[1] = 'originals'
        AND (storage.foldername(name))[2] = auth.uid()::text
      );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can read own original images'
  ) THEN
    ALTER POLICY "Users can read own original images"
      ON storage.objects
      TO authenticated
      USING (
        bucket_id = 'v-id-originals'
        AND (storage.foldername(name))[1] = 'originals'
        AND (storage.foldername(name))[2] = auth.uid()::text
      );
  ELSE
    CREATE POLICY "Users can read own original images"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'v-id-originals'
        AND (storage.foldername(name))[1] = 'originals'
        AND (storage.foldername(name))[2] = auth.uid()::text
      );
  END IF;
END $$;
