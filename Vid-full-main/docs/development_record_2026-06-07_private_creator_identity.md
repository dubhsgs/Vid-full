# VAID Development Record - Private Creator Identity

Date: 2026-06-07
Commit: pending

## Goal

Move character and creator details after the existing image crop step, add
private creator identity-document details, and keep the public verification page
unchanged.

## User Flow

1. Upload the character image and enter character name, creator name, country
   or region, document type, and document number.
2. Adjust the existing crop, position, and scale controls without visual or
   behavioral changes.
3. Optionally upload private creation proof materials.
4. Agree to the Terms of Service and Privacy Policy, then generate the record.

## Privacy Boundary

- Identity-document details are not written to local storage.
- Identity-document details are not added to `public_v_ids`.
- The full document number is stored only as AES-GCM ciphertext.
- Only the last four characters are retained separately for future private
  account display.
- The public verification page is unchanged.

## Backend

- New private table: `v_id_creator_identity_claims`
- New authenticated Edge Function: `creator-identity-register`
- The function verifies record ownership before storing or updating an identity
  claim.
- Required secret: `IDENTITY_ENCRYPTION_KEY` containing a base64-encoded
  32-byte key.

## Verification

- `npm run build`
- `git diff --check`
- Remote migration and Edge Function deployment
- Anonymous access denied by RLS and table grants
