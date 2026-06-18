# VAID Architecture Facts and Decisions

Updated: 2026-06-15

Status: historical decision snapshot. Use `VAID_MASTER_HANDOFF.md` for current
instructions and current production facts. Established decisions in this file
remain useful rationale, but measured state and risk status may be outdated.

## 1. Purpose

This file records the 2026-06-15 source-of-truth snapshot for VAID's frontend,
backend, storage, card rendering, and object-retention behavior. It separates:

1. established product rules;
2. deployed production facts;
3. measured production data;
4. known risks;
5. proposals that still require approval.

## 2. Established Product Rules

- Google Chrome output is the visual standard for the digital identity card.
- Every surface must show the same canonical card:
  - card generator page;
  - public verification page;
  - downloaded card file;
  - any future card preview.
- Built-in card labels and values remain English. Page UI may be localized.
- Original uploaded works are private and temporary. VAID does not retain the
  full original work after server-side hash verification.
- Supporting evidence is creator-only private material. It must not appear on
  the home page or public verification page.
- Supporting-evidence original files are retained by the user, not VAID.
- Storage-retention changes require explicit approval.
- Public verification exposes only approved public fields.
- VAID provides record and verification assistance. It is not copyright
  registration, notarization, judicial certification, or automatic ownership
  determination.

## 3. Deployed System

### 3.1 Frontend and hosting

- React, TypeScript, Vite, Tailwind CSS.
- Static frontend hosted by Nginx on Aliyun at `47.93.232.20`.
- Production web root: `/srv/www/vaid.top/current`.
- Production origin: `https://vaid.top`.
- The current frontend build is approximately 13 MB on the server.

### 3.2 Supabase

- Organization plan: Free.
- Region: West US (Oregon), `us-west-2`.
- Compute: nano.
- Supabase provides:
  - email OTP authentication;
  - PostgreSQL source-of-truth data;
  - RLS and service-role Edge Functions;
  - temporary original-file storage;
  - public avatar and current canonical-card storage;
  - private OTS proof storage;
  - cron and `pg_net` job dispatch.
- Twenty Edge Functions are deployed.

### 3.3 Aliyun canonical card renderer

- A Node and Playwright renderer runs as `vaid-card-renderer.service`.
- It listens only on `127.0.0.1:8787`.
- Nginx exposes the secret-protected route
  `/internal/card-renderer/render-card`.
- Renderer browser: controlled Chromium/Chrome 133 environment.
- Logical card size: 1024 x 576.
- Download output size: 2048 x 1152 lossless PNG at DPR 2.
- Public verification preview size: 1024 x 576 compressed image.
- The renderer opens `https://vaid.top/card-renderer`, executes the shared
  canvas renderer, and returns a lossless PNG plus a compressed preview image
  as base64 JSON.
- `v-id-register` stores the compressed public verification preview and returns
  the lossless PNG only to the current frontend generation session.

### 3.4 Cloudflare R2

- The `vaid-evidence` R2 bucket is private and used for temporary supporting
  evidence uploads.
- The `vaid-cards` R2 bucket is private and used for long-term compressed card
  previews.
- Browser uploads use a 15-minute presigned PUT URL.
- The backend validates object size and MIME type with HEAD, records metadata
  and the client-computed SHA-256, then deletes the R2 object.
- Card previews use the separate private `vaid-cards` bucket with the `cards/`
  prefix.
- Cloudflare console was verified on 2026-06-15:
  - bucket: `vaid-evidence`;
  - public access: disabled;
  - bucket size: 0 B;
  - object list: empty;
  - current-period visible operations: 40 Class A, 10 Class B.

## 4. Object Lifecycle Matrix

| Object | Current storage | Visibility | Retention | Source of truth |
| --- | --- | --- | --- | --- |
| Full original work | Supabase `v-id-originals` | Private | Deleted after registration attempt; abandoned uploads cleaned after 24 hours | SHA-256 and record metadata in PostgreSQL |
| Cropped avatar | Supabase `v-id-images/avatars` | Public | Long-term | `v_ids.image_url` |
| Compressed card preview | Cloudflare R2 `vaid-cards` bucket under `cards/`, via `card-preview` function | Publicly viewable, private object | Long-term | `v_ids.card_image_url` plus render metadata |
| Lossless card PNG | Browser session after generation | User-local | Not retained by VAID long-term | Current generation session |
| OTS proof | Supabase `v-id-ots` | Private | Long-term | `v_ids.ots_file_path` and `ots_jobs` |
| Supporting-evidence original | Cloudflare R2 evidence bucket | Private | Deleted after metadata registration or expiry | User-retained file |
| Supporting-evidence metadata | PostgreSQL | Creator-only | Long-term with record | `v_id_evidence_materials` |
| Creator identity number | PostgreSQL AES-GCM ciphertext | Creator-only | Long-term with record | `v_id_creator_identity_claims` |

## 5. Current Creation Flow

1. User signs in and passes email confirmation.
2. Browser computes the original file SHA-256.
3. Browser uploads:
   - full original to private Supabase temporary storage;
   - compressed cropped avatar to public Supabase storage.
4. `v-id-register`:
   - downloads the original;
   - recomputes and verifies SHA-256;
   - atomically consumes one credit;
   - creates the VAID record;
   - creates the OTS job;
   - synchronously calls the Aliyun card renderer;
   - uploads the compressed verification preview to R2;
   - returns a lossless PNG for the current download package;
   - deletes the temporary original in `finally`.
5. Browser separately saves the encrypted creator identity claim.
6. Browser optionally uploads evidence files to R2 one at a time.
7. Browser opens the card generator page.

Only credit consumption, VAID record creation, and OTS job creation are one
database transaction. Identity saving, evidence upload, and card rendering are
not part of that transaction.

## 6. Card Display and Download Behavior

- Card generator previews `card_image_url` when available.
- Public verification prefers `card_image_url`.
- Download uses the one-time lossless PNG returned during the current
  generation session.
- Public verification does not use browser canvas as a visible card fallback.
- If the compressed preview is missing or fails to load, public verification
  shows a pending/unavailable state.
- The card generator can still fall back to local browser canvas for the
  one-time download if the session lossless PNG is unavailable.
- The public verification page must not show a browser-canvas fallback card.
- The archive PDF currently contains English pages followed by Chinese pages.
- The archive PDF does not embed the canonical card image; the card is a
  separate file in the ZIP.

## 7. Measured Production Snapshot

Measured on 2026-06-15:

### Supabase data

- Auth users: 10.
- Monthly active users in the current billing period: 7 of 50,000 included.
- VAID records: 2.
- Canonical cards ready: 2.
- Evidence materials: 0.
- Evidence upload sessions: 0.
- OTS jobs: 2 stamped.
- PostgreSQL database size: 17,091,731 bytes, approximately 17.1 MB.
- Supabase Usage dashboard database metric: 30.87 MB of 0.5 GB included.
  The dashboard metric and direct `pg_database_size` query use different
  accounting views, so both values are retained rather than silently merged.
- Current billing-period egress: approximately 0.12 GB of 5 GB included.
- Current billing-period cached egress: approximately 0.001 GB of 5 GB
  included.
- Current billing-period Edge Function invocations: 8,330 of 500,000 included.

### Supabase Storage

| Bucket/path | Objects | Bytes |
| --- | ---: | ---: |
| `v-id-images/avatars` | 49 | 667,665 |
| `v-id-images/cards` | 2 | 5,622,987 |
| `v-id-images/ots` legacy objects | 4 | 4,989 |
| `v-id-ots/ots` | 14 | 8,674 |

The two cards average approximately 2.81 MB each. Current card storage is about
8.4 times the total storage used by all 49 avatars.

At the current average card size, 1 GB holds only about 355 cards before
allowing for avatars, OTS files, and other objects. This is a capacity estimate,
not a hard record limit.

### Aliyun renderer host

- Total RAM: approximately 896 MB.
- Swap: none.
- Renderer service memory observed:
  - approximately 142 MB RSS;
  - approximately 231 MB reported by systemd cgroup accounting.
- Root disk: 30 GB total, approximately 22 GB available.
- Renderer application directory: approximately 13 MB.
- Current renderer logs contain startup and errors, but not per-job duration,
  peak memory, queue depth, or output size.
- Observed successful render responses returned roughly 2.87-3.74 MB of base64
  JSON payload over HTTP.

### Lossless PNG experiment

Using one current canonical card:

- Browser-generated PNG: approximately 2.7 MB.
- Re-encoded lossless PNG: approximately 2.2 MB.
- Decoded pixel checksum was identical.
- Saving: approximately 18%.
- 1024 x 576 lossless PNG: approximately 743 KB, but this changes the approved
  output resolution.
- High-quality JPEG: approximately 364 KB, but it is lossy and is not an
  acceptable sole canonical master without QR and text-edge validation.

### Cloudflare R2

- Evidence bucket: `vaid-evidence`.
- Purpose: temporary supporting-evidence upload staging.
- Card preview bucket: `vaid-cards`.
- Purpose: long-term compressed verification-card previews.
- Public access: disabled.
- Bucket size: 0 B.
- Object list: empty.
- Current-period visible operations: 40 Class A, 10 Class B.
- This confirms that supporting-evidence originals are not being retained in R2
  after the registration flow completes.

## 8. Confirmed Risks

### Critical consistency risks

1. Result-page browser canvas fallback can produce a download card different
   from the Chrome canonical standard if the session lossless PNG is missing.
2. The renderer launches a new Chromium process per request and has no
   concurrency limit. The 896 MB server can be exhausted by simultaneous jobs.
3. There is no durable render queue, retry policy, or automatic failed-card
   recovery.

### User-flow risks

1. Registration waits synchronously for card rendering.
2. A render failure does not roll back the record or restore the consumed
   credit. The record remains valid with `card_render_status = failed`.
3. Identity saving happens after record creation. Identity failure leaves a
   created and charged record.
4. Evidence upload happens after record creation. Evidence failure leaves a
   valid record but the UI reports a generation-stage error.
5. Retrying the flow can upload additional public avatars even when the
   existing record is reused.

### Storage and lifecycle risks

1. Production has 49 avatars but only 2 VAID records. Public avatar uploads are
   not removed after failed, duplicate, or abandoned registration attempts.
2. There is no canonical-card deletion or replacement lifecycle beyond
   `upsert`.
3. Base64 transfer adds roughly 33% payload overhead and makes Supabase Edge
   Functions relay multi-megabyte card data.
4. Supabase Free Storage and egress are more constrained than R2 and should not
   be the long-term public-card delivery layer.

### Operations and testing risks

1. No automated test files exist.
2. Cross-browser card consistency is not tested automatically.
3. Registration partial-failure behavior is not tested automatically.
4. Avatar orphan cleanup is not implemented or monitored.
5. Renderer latency, failures, memory, and queue depth are not monitored.
6. Supabase currently reports a Security Advisor warning because
   `public_v_ids` is a security-definer view. The view exposes an explicit
   approved field list, but future changes must continue to review this
   boundary carefully.

## 9. Architecture Options

### Option A: keep the current synchronous Supabase card path

Advantages:

- smallest code change;
- card is normally ready when registration returns;
- current production behavior is already proven for two records.

Disadvantages:

- user waits for Chrome rendering and multi-megabyte relay;
- renderer failure is coupled to the registration response;
- no retries or concurrency protection;
- Supabase Storage and egress become the card bottleneck;
- Edge Function memory and network use scale with every generated card.

### Option B: do not store cards and render on every view or download

Advantages:

- no permanent card object storage.

Disadvantages:

- every view depends on renderer availability;
- repeated 6+ second work for the same record;
- poor user experience and higher server load;
- download and preview can fail at different times;
- cannot guarantee immediate global availability.

This option does not meet the reliability and wait-time requirements.

### Option C: asynchronous compressed verification card with R2 storage

Advantages:

- one controlled Chrome render remains the only source;
- verification surfaces use the same compressed immutable preview file;
- the download package receives a lossless PNG from the same render session;
- registration is not blocked by rendering;
- render failures can retry without charging again;
- renderer uploads directly to R2, avoiding base64 relay through Supabase;
- R2 is better suited to public file delivery and egress;
- Supabase remains the metadata and authorization source of truth.

Current Cloudflare R2 Standard free tier, verified from official documentation
on 2026-06-15:

- 10 GB-month storage;
- 1 million Class A operations per month;
- 10 million Class B operations per month;
- free Internet egress.

At a 300-500 KB compressed preview size, 10 GB holds roughly 20,000-33,000
verification card previews. At a 900 KB PNG fallback size, 10 GB holds roughly
11,000 previews. These estimates exclude supporting-evidence objects while they
are temporarily present.

Disadvantages:

- requires a render-job state machine;
- card page must briefly show a generating state;
- requires private R2 storage and a controlled proxy endpoint;
- requires retry, callback authentication, cleanup, and monitoring.

## 10. Recommended Target Architecture

Approved and implemented. Production uses a separate private `vaid-cards`
bucket for verification-card previews. The `vaid-evidence` bucket remains for
temporary supporting-evidence upload staging.

### Canonical card

- Keep one compressed 1024 x 576 public verification preview long-term.
- Generate one 2048 x 1152 lossless PNG for the user's immediate download
  package, but do not retain that PNG long-term.
- Store the compressed preview in private R2 bucket `vaid-cards` under the
  `cards/` prefix.
- Serve verification previews through the `card-preview` Edge Function.
- Keep card previews and temporary evidence originals separated by bucket.
- Keep the compressed public avatar so a card can be regenerated after a
  renderer update or object-loss event.

### Processing

- `v-id-register` should atomically create:
  - VAID record;
  - credit consumption;
  - OTS job;
  - card render job with `pending` status.
- Return the friendly ID immediately after the database transaction.
- Run the Aliyun renderer with concurrency 1 on the current 896 MB server.
- Reuse one managed Chromium process or strictly serialize browser launches.
- Renderer uploads directly to R2 and sends only URL, SHA-256, byte size,
  dimensions, and renderer version back to Supabase.
- Retry failed renders with a bounded policy, for example three attempts.
- Use an idempotent object key and job ID.

### Frontend

- Card generator polls the public render status for a bounded time.
- While pending, show a clear generating state.
- Public verification shows the same generating state for pending cards.
- Production must not use browser canvas as a visible card fallback.
- If rendering fails after retries, show a retryable error, not a different
  browser-generated card.
- Download must use the lossless PNG from the current generation session, not
  the compressed R2 preview.

### Object lifecycle

- Add cleanup for public avatars that are not referenced by a VAID record.
- On duplicate registration, delete the newly uploaded unused avatar.
- On registration failure, delete both temporary original and unused avatar.
- Keep original works and supporting-evidence originals temporary as they are
  today.
- Keep OTS proof files private and permanent.

### Partial failures

- Treat the VAID record as successfully created once the database transaction
  commits.
- Identity failure should be reported as "record created, identity details need
  retry", not total generation failure.
- Evidence failure should be reported as "record created, evidence upload needs
  retry", not total generation failure.
- Provide authenticated retry entry points for identity and evidence.

### Minimum verification before deployment

1. Automated pixel-hash test for renderer output.
2. Test that card generator and verification page use the compressed R2 preview,
   and that download uses the session lossless PNG.
3. Test Chrome, Safari, iOS Safari, Android Chrome, and Firefox display.
4. QR scan test from the compressed verification preview and the lossless
   download PNG.
5. Renderer concurrency and memory test on the 896 MB Aliyun host.
6. Render retry and idempotency test.
7. Failed and duplicate registration avatar-cleanup test.
8. For the proposed card bucket, confirm object count, storage, proxy cache
   behavior, and CORS.
9. Confirm Supabase RLS and public-view fields after the new metadata changes.
10. Run `npm run typecheck`, `npm run lint`, and `npm run build`.

## 11. Decision Status

- Keep original works temporary: established and deployed.
- Keep supporting-evidence originals temporary: established and deployed.
- Keep card built-in text English: established rule.
- Use one controlled Chrome render as the visual standard: established and
  deployed.
- Permanently store one compressed verification card preview: approved for this
  implementation.
- Do not permanently store the lossless download PNG: approved for this
  implementation.
- Move verification card previews to private R2 bucket `vaid-cards` under the
  `cards/` prefix: approved and deployed for this implementation.
- Make rendering asynchronous with retries: recommended, not approved.
- Remove visible browser-canvas fallback on public verification: approved for
  this implementation.
- Losslessly optimize retained canonical PNG: rejected for the current product
  shape because the retained card is a compressed verification preview, not a
  high-resolution archive master.
