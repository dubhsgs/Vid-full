-- Allow OpenTimestamps proof files to be stored alongside certificate images.
-- OTS files are uploaded by service-role Edge Functions under the `ots/` prefix.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/octet-stream']
WHERE id = 'v-id-images';
