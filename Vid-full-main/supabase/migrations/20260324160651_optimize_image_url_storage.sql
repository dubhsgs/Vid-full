/*
  # Optimize image_url Storage

  1. Changes
    - Document that image_url will store Storage URLs instead of base64 data
  
  2. Notes
    - Existing records with base64 data will remain (for backward compatibility)
    - New records will use Supabase Storage URLs
    - Storage URLs are much shorter (~100 chars vs 150KB+ for base64)
    - Cannot create index due to existing large base64 values
*/

-- Add comment to document the new usage
COMMENT ON COLUMN v_ids.image_url IS 'URL to character avatar image in Supabase Storage (v-id-images bucket) or base64 data URL for legacy records';
