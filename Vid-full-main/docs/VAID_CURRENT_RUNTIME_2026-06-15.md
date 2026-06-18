# VAID Current Runtime

Updated: 2026-06-15 22:34 CST

Status: historical runtime snapshot. It predates the 2026-06-18 frontend
maintainability refactor and operations documentation. Use
`VAID_MASTER_HANDOFF.md` for current instructions. Retain this file only for
detailed historical evidence.

## 1. Scope

This document records the real behavior found in the current codebase:

- frontend routes and pages;
- generation flow;
- card preview and download flow;
- public verification flow;
- Supabase Edge Functions;
- Supabase and R2 storage behavior;
- payment, activation code, and quota behavior;
- important gaps and risks.

## 2. Current Product Shape

VAID is currently a generation and public-verification website.

It is not currently a full user-dashboard product. There is no route for:

- user profile dashboard;
- historical VAID record list;
- re-download center;
- account record management;
- admin panel in the frontend.

The user's own card download is currently tied to the post-generation
`/card-generator` result page and the browser's local/session storage state.

## 3. Frontend Routes

The active routes are defined in `src/main.tsx`.

| Route | Component | Purpose |
| --- | --- | --- |
| `/` | `App` | Home page, marketing content, auth, upload, generation form, payment prompt |
| `/card-generator` | `CardGenerator` | Post-generation result page and ZIP download |
| `/verify/:id` | `VerifyPage` | Public verification page for a VAID Record ID |
| `/privacy` | `PrivacyPage` | Privacy policy |
| `/terms` | `TermsPage` | Terms |
| `/docs` | `DocsPage` | Documentation page |
| `/payment-success` | `PaymentSuccessPage` | Alipay payment return and order status check |
| `/card-renderer` | `CardRendererPage` | Internal rendering page used by the server-side Chrome renderer |
| `*` | `NotFoundPage` | 404 fallback |

Important implication:

- `/card-generator` is not a user account page.
- `/card-generator` is not a durable historical download page.
- It only works when the required local/session storage data exists.

## 4. Authentication

Authentication is handled by Supabase Auth email OTP.

Frontend component: `src/components/AuthControl.tsx`.

Current behavior:

1. User enters an email.
2. Frontend calls `supabase.auth.signInWithOtp`.
3. User enters the OTP code or follows the email redirect.
4. Frontend exchanges the auth code or verifies the OTP.
5. The app checks whether the email is confirmed.
6. Generation requires an authenticated and email-confirmed user.

The app does not currently expose a full account dashboard after login.

## 5. Generation Flow

Main frontend file: `src/App.tsx`.

### 5.1 User inputs

The user provides:

- original image file;
- character/work name;
- creator name;
- country/region;
- identity document type;
- identity document number;
- optional private evidence files;
- terms agreement;
- optional activation code if free credits are not enough.

Image restrictions in current frontend:

- max original image size: 8 MB;
- allowed original image MIME types:
  - JPEG;
  - PNG;
  - WebP;
  - GIF.

Evidence file restrictions in current frontend:

- max evidence file size: 300 MB;
- max evidence files per record: 3;
- allowed evidence MIME types:
  - JPEG;
  - JPG;
  - PNG;
  - WebP;
  - GIF;
  - MP4;
  - QuickTime;
  - WebM;
  - PDF.

### 5.2 Cropped avatar preparation

Before registration, the user crops/positions the uploaded image.

The frontend creates a circular 240 x 240 canvas avatar preview and stores it
as `vid_uploaded_avatar` in local storage.

This cropped avatar is separate from the full original file.

### 5.3 Access check

Before registration, the frontend checks:

- authenticated user;
- confirmed email;
- remaining free credits;
- activation-code availability when free credits are exhausted.

Free and paid usage is backed by `user_credits`.

Activation codes are backed by `license_keys` and are redeemed into credits.

### 5.4 Original hash

The frontend computes SHA-256 from the original uploaded image file.

This client-computed hash is passed to `v-id-register`, but the backend does not
trust it blindly. The backend downloads the temporary original file and
recomputes SHA-256 server-side.

### 5.5 Uploads before registration

Before calling `v-id-register`, the frontend uploads:

1. Full original file to private Supabase Storage bucket `v-id-originals`.
2. Compressed cropped avatar JPEG to public Supabase Storage bucket
   `v-id-images`, under `avatars/<user_id>/<uuid>.jpg`.

The avatar upload happens before database registration. This means failed or
duplicate registration can leave public avatar objects unless cleanup is added.

## 6. `v-id-register` Backend Flow

Edge Function: `supabase/functions/v-id-register/index.ts`.

### 6.1 Required auth

The function requires:

- authenticated Supabase user;
- confirmed email.

### 6.2 Request body

The frontend sends:

- `character_name`;
- `creator_name`;
- `sha256_hash`;
- `image_url`;
- `original_file_path`.

### 6.3 Backend validation

The backend checks:

- names are present;
- SHA-256 format is valid;
- `image_url` is a Supabase public URL under `v-id-images/avatars/<user_id>/...`;
- `original_file_path` is under `v-id-originals/originals/<user_id>/...`;
- original file exists;
- original file size is greater than 0 and no more than 8 MB;
- original file MIME type is allowed;
- server-computed original SHA-256 matches the submitted SHA-256.

### 6.4 Database registration

After validation, the function calls RPC `register_v_id`.

Current database behavior:

- If the same SHA-256 already belongs to the same user, return duplicate status
  and do not consume another credit.
- If the same SHA-256 belongs to another user, reject it.
- If no usable credits exist, reject it.
- Otherwise consume one credit.
- Create a `v_ids` record.
- Generate a public `friendly_id`.
- Create an `ots_jobs` row.
- Set `ots_status` to `pending`.
- Set `card_render_status` to `pending`.

### 6.5 Original file deletion

The backend deletes the original file in a `finally` block after registration
attempt processing.

Important implication:

- The full original work is temporary.
- VAID keeps the hash and metadata, not the full original file.
- A cron-backed cleanup also exists for abandoned original uploads older than
  the configured age.

## 7. Current Canonical Card Rendering

### 7.1 Renderer host

There is a separate Node/Playwright renderer under `ops/card-renderer`.

Current server behavior:

- runs as `vaid-card-renderer.service`;
- listens on `127.0.0.1:8787`;
- exposed through Nginx internal route `/internal/card-renderer/render-card`;
- protected by `x-vaid-card-renderer-secret`;
- opens `/card-renderer#<payload>`;
- renders the shared card canvas in controlled Chrome;
- returns two outputs from the same server-side Chrome render:
  - 2048 x 1152 lossless PNG as base64 for the user's immediate download
    package;
  - 1024 x 576 compressed preview image, currently WebP when supported, as
    base64 for long-term public verification display.

### 7.2 Registration-time render

After database registration, `v-id-register` calls the renderer synchronously.

If rendering succeeds:

- backend uploads the compressed preview image to the private R2 bucket
  configured by `R2_CARDS_BUCKET`;
- object path is `cards/<user_id>/<friendly_id>.webp` when WebP export is
  supported;
- stores the public `card-preview` function URL in `v_ids.card_image_url`;
- stores `card_render_status = ready`;
- stores render version, image SHA-256, and generated timestamp.
- returns the 2048 x 1152 PNG base64 to the frontend for this generation
  session only.

If rendering fails:

- registration can still return success;
- `card_image_url` may be null;
- `card_render_status` can become `failed`;
- public verification shows a pending/unavailable state instead of rendering a
  browser-generated card.

### 7.3 Current card storage

Current long-term card preview files are stored in the private R2 bucket
configured by `R2_CARDS_BUCKET`.

- production bucket as of 2026-06-16: `vaid-cards`;
- path prefix: `cards/`;
- visibility: private R2 object, served publicly only through the `card-preview`
  Supabase Edge Function;
- expected format: 1024 x 576 WebP, with PNG fallback only if WebP export is
  not available.

The 2048 x 1152 lossless PNG is not stored long-term. It is returned to the
frontend for the current download package.

## 8. Post-Generation Result Page

Page: `/card-generator`.

Component: `src/components/CardGenerator.tsx`.

### 8.1 How access works

`/card-generator` depends on browser storage:

- `vid_uploaded_avatar`;
- `vid_character_name`;
- `vid_creator_name`;
- `vid_registered_friendly_id`;
- `vid_registered_hash`;
- optional `vid_standard_card_image_url`;
- optional `vid_download_card_image_base64`;
- `v-id-generation-ready-at`;
- `v-id-card-generator-session`.

If required data is missing or the generation handoff is expired, the page
redirects to `/`.

Important implication:

- This is a one-time result/download page.
- It is not a durable record history page.
- It is not a user account dashboard.

### 8.2 Card display on result page

The result page prefers `vid_standard_card_image_url` from local storage.

It also queries `public_v_ids` for:

- `card_image_url`;
- `card_render_status`.

If `card_image_url` exists and status is `ready`, the result page uses that
compressed standard preview image for display.

If no standard card image is available, it renders the card locally with browser
canvas for the current result page.

### 8.3 Download package

The download button creates a ZIP in the browser.

The ZIP contains:

1. Digital identity card PNG.
2. Archive certificate PDF.
3. Proof verification guide TXT.
4. Optional OTS file if available from `ots-download`.

For the card PNG:

- if `vid_download_card_image_base64` exists, it uses that 2048 x 1152 lossless
  PNG from the current generation session;
- otherwise it renders a new browser canvas image and exports PNG.

The download package must not use the long-term compressed R2 preview as the
user's archive card file.

For the PDF:

- the PDF currently includes archive certificate content;
- current code generates English and Chinese certificate pages;
- private evidence metadata can be included as a manifest;
- original private evidence files are not embedded in the PDF.

## 9. Public Verification Page

Page: `/verify/:id`.

Component: `src/pages/VerifyPage.tsx`.

### 9.1 Data source

The page reads from `public_v_ids`.

It selects:

- `friendly_id`;
- `character_name`;
- `creator_name`;
- `image_url`;
- `card_image_url`;
- `card_render_status`;
- `created_at`;
- `ots_status`.

It does not read private evidence materials, identity documents, payment data,
user ID, SHA-256 hash, or OTS file path.

### 9.2 Verification display

The page displays:

- public verification title;
- card preview;
- character name;
- creator name;
- Record ID;
- creation timestamp;
- OTS/archive status;
- explanatory text.

### 9.3 Card preview behavior

The verification page displays the stored compressed standard card preview when:

- `card_image_url` exists;
- `card_render_status` is `ready`;
- image loading has not failed.

If those conditions are not true, it displays a pending/unavailable state.

Important current risk:

- The verification page no longer displays a browser-rendered fallback card.
- This prevents Safari, mobile browsers, and language settings from creating a
  visibly different verification card.

### 9.4 Download behavior

The current verification page does not provide a download button for the full
ZIP package or card.

The public verification page is for public checking/display, not for user
account re-download.

## 10. Public Verification View

Database view: `public_v_ids`.

Current exposed fields after the standard-card migration:

- `friendly_id`;
- `character_name`;
- `creator_name`;
- `image_url`;
- `card_image_url`;
- `card_render_status`;
- `card_render_version`;
- `created_at`;
- `ots_status`.

The view intentionally does not expose:

- `user_id`;
- payment fields;
- `client_id`;
- private evidence metadata;
- `sha256_hash`;
- `ots_file_path`;
- identity document details.

## 11. Private Creator Identity

Frontend utility: `src/utils/creatorIdentity.ts`.

Backend function: `creator-identity-register`.

The identity details are saved after the VAID record is created.

Current behavior:

- identity country/region, document type, and document number are submitted
  after `v-id-register` succeeds;
- identity failure is handled as a later-stage error in the frontend;
- the VAID record may already exist and credits may already be consumed before
  identity save failure is reported.

Identity data is creator-only/private and is not part of public verification.

## 12. Private Evidence Uploads

Frontend utility: `src/utils/evidenceUpload.ts`.

Backend functions:

- `evidence-upload-init`;
- `evidence-upload-complete`;
- `evidence-cleanup`.

### 12.1 Upload init

After a VAID record exists, the frontend calls `evidence-upload-init`.

The backend:

- verifies authenticated and confirmed user;
- verifies the VAID record exists;
- verifies the record belongs to the user;
- checks max material count;
- creates an upload session in `v_id_evidence_upload_sessions`;
- creates an R2 object key under `evidence/<user_id>/<session_id>/<uuid>`;
- returns a 15-minute presigned R2 PUT URL.

### 12.2 Browser upload to R2

The browser uploads the file directly to R2 using the presigned PUT URL.

The frontend computes SHA-256 for the evidence file.

### 12.3 Upload complete

The frontend calls `evidence-upload-complete` with:

- upload session ID;
- client-computed evidence SHA-256.

The backend:

- verifies user ownership;
- checks session is pending and not expired;
- HEADs the R2 object;
- validates size and MIME type;
- checks for duplicate material hash under the same VAID record;
- inserts metadata into `v_id_evidence_materials`;
- marks session completed.

The R2 object is deleted in a `finally` block.

Important implication:

- R2 stores original evidence files only temporarily.
- Long-term storage keeps metadata and hash, not the evidence original file.
- The user must keep their own evidence original files.

### 12.4 R2 current state

Cloudflare dashboard was checked on 2026-06-15.

Current evidence bucket:

- bucket: `vaid-evidence`;
- public access: disabled;
- bucket size: 0 B;
- object list: empty.

This confirms that, at the time checked, R2 was not retaining evidence original
files.

## 13. OTS Flow

Current behavior:

- `register_v_id` creates an `ots_jobs` row.
- OTS processing is handled by Edge Functions such as `ots-worker`,
  `ots-stamp`, `ots-verify`, and `ots-download`.
- OTS files are stored in private Supabase bucket `v-id-ots`.
- Public verification shows OTS/archive status.
- Download package may include the OTS file if `ots-download` returns it.

The OTS proof file is not publicly exposed directly from storage.

## 14. Payment, Credits, and Activation Codes

### 14.1 Credits

Credits are stored in `user_credits`.

Generation requires available credits:

- free credits first;
- paid credits after free credits are exhausted.

Credit consumption happens inside the backend registration RPC, not only in
frontend code.

### 14.2 Activation codes

Activation codes are stored in `license_keys`.

Current frontend behavior:

- user can enter activation code;
- frontend checks status via `license-key-status`;
- frontend redeems usable code via `license-key-use`;
- redemption adds/uses credits through backend logic.

### 14.3 Alipay

Payment modal calls `alipay-create-order`.

Payment success page calls `alipay-query-order`.

Alipay notify flow updates orders and credits through backend functions.

In-site paid orders are tied to authenticated users.

Activation codes remain for offline/gift/distribution-style credit channels.

## 15. Storage Lifecycle Summary

| Object | Current storage | Visibility | Retention |
| --- | --- | --- | --- |
| Full original work | Supabase `v-id-originals` | Private | Deleted after registration attempt; stale abandoned uploads cleaned later |
| Cropped avatar | Supabase `v-id-images/avatars` | Public | Long-term currently; orphan cleanup is not implemented |
| Compressed standard card preview | Cloudflare R2 `vaid-cards` bucket under `cards/`, via `card-preview` function | Publicly viewable, private object | Long-term currently |
| Lossless download card PNG | Browser session after generation | User-local | Not stored long-term by VAID |
| OTS proof file | Supabase `v-id-ots` | Private | Long-term |
| Evidence original file | Cloudflare R2 `vaid-evidence` | Private | Temporary; deleted after completion or cleanup |
| Evidence metadata/hash | PostgreSQL `v_id_evidence_materials` | Creator-only | Long-term |
| Creator identity details | PostgreSQL encrypted/private table | Creator-only | Long-term |
| Public verification record | PostgreSQL `public_v_ids` view | Public | Long-term |

## 16. What Is Public

Public verification currently exposes:

- Record ID;
- character/work name;
- creator name;
- public avatar URL;
- public compressed standard card preview URL if ready;
- card render status;
- card render version;
- creation timestamp;
- OTS status.

Public verification does not expose:

- original image file;
- original SHA-256 hash;
- private evidence files;
- private evidence metadata;
- identity document details;
- user ID;
- payment/order details;
- OTS file path.

## 17. Important Current Risks

### 17.1 No user dashboard

There is no current product flow for a user to log back in and see all past
records or re-download previous ZIP packages.

Any future statement or architecture decision must not assume this exists
unless it is intentionally built.

### 17.2 Result-page dependency on browser storage

`/card-generator` depends on localStorage/sessionStorage.

If the user clears storage, uses another browser, or opens the result URL later,
the result page can fail and redirect home.

### 17.3 Verification page still displays cards

Even though there is no user dashboard, the public verification page currently
does display a card preview.

This is the main current reason the stored standard card image matters.

If the product decision changes so verification page no longer displays a card,
the storage requirement for long-term compressed card previews should be
reconsidered.

### 17.4 Browser fallback can create inconsistent result-page downloads

The result page can still fall back to browser canvas rendering for the download
package if the one-time lossless PNG is unavailable.

This can create differences across:

- Safari;
- Chrome;
- iOS Safari;
- Android browsers;
- canvas/image/font rendering behavior.

The public verification page no longer uses this fallback visibly.

### 17.5 Synchronous rendering slows registration

`v-id-register` currently waits for server Chrome rendering during registration.

This means user submission time includes:

- original upload;
- avatar upload;
- backend original download;
- backend SHA-256 verification;
- database write;
- server Chrome rendering;
- compressed card preview upload to R2.

If the renderer is slow or fails, registration can still create a record but
return without a ready verification-card preview or one-time lossless download
image.

### 17.6 R2 card storage configuration is required

The card preview flow now depends on:

- `R2_CARDS_BUCKET`;
- existing R2 account/access key/secret configuration.

Production currently sets `R2_CARDS_BUCKET=vaid-cards`. Supporting evidence
continues to use the separate `R2_EVIDENCE_BUCKET=vaid-evidence` bucket.

### 17.7 Avatar orphan risk

Avatar files are uploaded before database registration.

If registration fails, duplicate handling returns, or later stages fail, newly
uploaded avatars can remain unused.

Observed production data already showed many more avatar objects than VAID
records.

### 17.8 Partial failure states

The database record and credit consumption happen before:

- creator identity save;
- optional private evidence upload;
- card display/download on frontend.

If identity or evidence upload fails, a valid VAID record may already exist.

The frontend currently reports stage-specific errors, but the user experience
can still feel like the whole generation failed.

## 18. Current Minimal Truth About Card Storage

Current code saves a compressed standard card preview because:

- public verification page prefers it for display;
- browsers should not render their own public verification card.

This does not mean a user dashboard exists.

The real product question is:

- If public verification must show a visual card, then a compressed server
  generated preview should be retained.
- If public verification should only show record metadata and no card preview,
  then long-term card preview storage can be reconsidered.

The user download package receives a lossless PNG from the current generation
session. That lossless PNG is not retained by VAID long-term.

## 19. Files Most Relevant To This Runtime

Frontend:

- `src/main.tsx`
- `src/App.tsx`
- `src/components/CardGenerator.tsx`
- `src/pages/VerifyPage.tsx`
- `src/pages/CardRendererPage.tsx`
- `src/components/AuthControl.tsx`
- `src/components/PaywallModal.tsx`
- `src/utils/imageUpload.ts`
- `src/utils/evidenceUpload.ts`
- `src/utils/licenseManager.ts`
- `src/utils/certificateCanvas.ts`

Backend:

- `supabase/functions/v-id-register/index.ts`
- `supabase/functions/evidence-upload-init/index.ts`
- `supabase/functions/evidence-upload-complete/index.ts`
- `supabase/functions/evidence-cleanup/index.ts`
- `supabase/functions/original-cleanup/index.ts`
- `supabase/functions/creator-identity-register/index.ts`
- `supabase/functions/ots-worker/index.ts`
- `supabase/functions/ots-verify/index.ts`
- `supabase/functions/ots-download/index.ts`
- `supabase/functions/alipay-create-order/index.ts`
- `supabase/functions/alipay-notify/index.ts`
- `supabase/functions/alipay-query-order/index.ts`
- `supabase/functions/license-key-status/index.ts`
- `supabase/functions/license-key-use/index.ts`

Renderer:

- `ops/card-renderer/server.mjs`
- `ops/card-renderer/vaid-card-renderer.service`

Migrations:

- `supabase/migrations/20260615103000_add_standard_card_image_fields.sql`
- `supabase/migrations/20260605090000_create_r2_evidence_upload_sessions.sql`
- `supabase/migrations/20260604103000_create_private_evidence_materials.sql`
- `supabase/migrations/20260604090000_original_upload_cleanup.sql`
- `supabase/migrations/20260603090000_public_verification_and_ots_security_baseline.sql`
- `supabase/migrations/20260607100000_create_private_creator_identity_claims.sql`
