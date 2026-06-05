# VAID Development Record - R2 Private Evidence Uploads

Date: 2026-06-05
Commit: pending

## Goal

Move private creator evidence material originals away from Supabase Storage and prepare a Cloudflare R2 direct-upload backend.

## Files Changed

- `supabase/functions/_shared/r2.ts`
- `supabase/functions/evidence-upload-init/index.ts`
- `supabase/functions/evidence-upload-complete/index.ts`
- `supabase/functions/evidence-cleanup/index.ts`
- `supabase/functions/evidence-material-register/index.ts`
- `supabase/migrations/20260605090000_create_r2_evidence_upload_sessions.sql`
- `docs/development_record_2026-06-05_r2_private_evidence_uploads.md`

## Product Boundary

- Public verification pages must not show whether private proof materials were uploaded.
- Private proof materials are for creator-side evidence packages, lawyer review, or court use.
- VAID keeps proof material fingerprints and metadata.
- Original proof material files are temporary and should be deleted from R2 after registration or cleanup.
- Users must keep their original proof files. Without the original file, a stored fingerprint cannot be independently matched later.

## Backend Flow

1. Authenticated user calls `evidence-upload-init`.
2. Backend verifies email confirmation, record ownership, file type, file size, and material count.
3. Backend creates a pending upload session and returns a 15-minute R2 presigned `PUT` URL.
4. Browser uploads the selected proof material directly to private R2 storage.
5. Browser calls `evidence-upload-complete` with the session id and SHA-256 hash calculated locally.
6. Backend checks the R2 object exists and verifies size/type against the upload session.
7. Backend stores private metadata in `v_id_evidence_materials`.
8. Backend deletes the temporary R2 original.

## First-Version Limits

- Single file limit: 300MB.
- Max proof materials per certificate: 3.
- Supported types: video, image, PDF.
- Upload URL expiry: 15 minutes.
- No public R2 bucket and no public custom domain.
- No multipart upload in the first version.

## Required Environment Variables

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_EVIDENCE_BUCKET`

## Security Notes

- R2 credentials must be stored only as Supabase Edge Function secrets.
- The R2 key must be scoped only to the private evidence bucket.
- Frontend must never receive permanent R2 credentials.
- `evidence-material-register` now returns `410` so older Supabase Storage upload clients fail closed.

## Verification Performed

- Pending.

## Deployment Status

- Not deployed.
- Cloudflare R2 subscription, bucket, CORS, and API token are not configured yet.

## Rollback Notes

- Revert this commit.
- Do not deploy `evidence-upload-init` or `evidence-upload-complete` if R2 secrets are missing.
