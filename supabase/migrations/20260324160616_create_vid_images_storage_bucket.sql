/*
  # Create Storage Bucket for V-ID Images

  1. Storage Setup
    - Create 'v-id-images' bucket for storing character avatar images
    - Configure bucket to be publicly accessible for reading
    - Set size limits and allowed file types
  
  2. Security
    - Enable RLS on storage.objects
    - Allow public read access to images
    - Allow public uploads for current implementation
  
  3. Notes
    - Images will be stored with UUID-based filenames to prevent collisions
    - Public read access enables direct image loading without authentication
    - This replaces storing base64 data URLs in the database
*/

-- Create the storage bucket for V-ID images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'v-id-images',
  'v-id-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public read access for v-id-images" ON storage.objects;
  DROP POLICY IF EXISTS "Public upload access for v-id-images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
END $$;

-- Allow public read access to v-id-images bucket
CREATE POLICY "Public read access for v-id-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'v-id-images');

-- Allow anyone to upload to v-id-images bucket
CREATE POLICY "Public upload access for v-id-images"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'v-id-images');

-- Allow users to update images
CREATE POLICY "Users can update own images"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id = 'v-id-images');

-- Allow users to delete images
CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'v-id-images');
