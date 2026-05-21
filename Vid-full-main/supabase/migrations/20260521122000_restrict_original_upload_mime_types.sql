-- Keep original proof uploads limited to browser-supported image MIME types.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif'
]
WHERE id = 'v-id-originals';
