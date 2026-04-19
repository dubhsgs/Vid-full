/*
  # Add Friendly ID to V-IDs Table

  1. Changes
    - Add `friendly_id` column (text, unique) - Human-readable ID like V4DO-N755-9871
    - Add unique index on `friendly_id` for fast lookups
    - Keep existing `id` (uuid) as primary key for internal references
  
  2. Security
    - No RLS changes needed (inherits from existing policies)
  
  3. Important Notes
    - `friendly_id` will be used for public verification URLs
    - Format: VXXX-XXXX-XXXX (e.g., V4DO-N755-9871)
    - Must be unique and indexed for performance
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'v_ids' AND column_name = 'friendly_id'
  ) THEN
    ALTER TABLE v_ids ADD COLUMN friendly_id text UNIQUE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_v_ids_friendly_id ON v_ids(friendly_id);
