/*
  # Add OTS (OpenTimestamps) fields to v_ids table

  ## Changes
  - `v_ids` table:
    - `ots_status` (text): tracks timestamping state — 'pending' | 'stamped' | 'confirmed' | 'failed'
    - `ots_file_path` (text): storage path to the .ots proof file in Supabase Storage
    - `original_file_hash` (text): SHA-256 of the original uploaded image file bytes (distinct from the metadata hash)

  ## Notes
  - ots_status defaults to 'pending'
  - original_file_hash is what gets submitted to OTS; it is computed in-browser from the raw file before any compression
  - RLS is already enabled on v_ids; no new policies needed (existing policies cover the new columns)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'v_ids' AND column_name = 'ots_status'
  ) THEN
    ALTER TABLE v_ids ADD COLUMN ots_status text NOT NULL DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'v_ids' AND column_name = 'ots_file_path'
  ) THEN
    ALTER TABLE v_ids ADD COLUMN ots_file_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'v_ids' AND column_name = 'original_file_hash'
  ) THEN
    ALTER TABLE v_ids ADD COLUMN original_file_hash text;
  END IF;
END $$;
