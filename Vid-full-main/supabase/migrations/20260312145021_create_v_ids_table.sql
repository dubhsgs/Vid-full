/*
  # V-ID Registry Table

  1. New Tables
    - `v_ids`
      - `id` (uuid, primary key) - Unique identifier
      - `character_name` (text) - Name of the virtual character
      - `creator_name` (text) - Name of the creator
      - `sha256_hash` (text, unique) - SHA-256 digital fingerprint
      - `image_url` (text) - Base64 or URL to character image
      - `created_at` (timestamptz) - Registration timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `v_ids` table
    - Add policy for public to read all registered V-IDs (gallery)
    - Add policy for anyone to insert new V-IDs (open registration)
    - No update or delete policies (immutable registry)

  3. Important Notes
    - V-IDs are immutable once created
    - SHA-256 hash must be unique to prevent duplicates
    - Public read access for transparency
    - Open registration for ease of use
*/

CREATE TABLE IF NOT EXISTS v_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_name text NOT NULL,
  creator_name text NOT NULL,
  sha256_hash text UNIQUE NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v_ids_created_at ON v_ids(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v_ids_sha256_hash ON v_ids(sha256_hash);

ALTER TABLE v_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view registered V-IDs"
  ON v_ids
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can register new V-IDs"
  ON v_ids
  FOR INSERT
  WITH CHECK (true);
