# VAID AI Development Context

## 1. Project Goal

VAID helps creators create a verifiable archive record for original digital
works, virtual characters, and AI-generated works before they publish or share
them.

The product provides supporting evidence and verification assistance. It is not
copyright registration, notarization, judicial certification, or an automatic
legal determination of ownership.

## 2. Target Users

- Independent artists and illustrators
- Original character and digital IP creators
- AI visual creators
- Small creative teams that need a lightweight pre-publication archive

## 3. Core User Flow

1. A user signs in with Supabase email OTP.
2. The user uploads an original image and enters character, creator, country,
   and identity-document details.
3. The user adjusts the image crop and position, then may add private creation
   proof materials.
4. The frontend uploads the original image temporarily to private storage and
   uploads a cropped public avatar image.
5. The `v-id-register` Edge Function downloads the original image, recomputes
   its SHA-256 hash, validates the request, and calls the database RPC.
6. The RPC atomically consumes one credit, creates the VAID record, and inserts
   an OTS job.
7. The creator identity claim is encrypted and stored separately from all
   public verification data.
8. The user downloads a certificate package and can share the public
   `/verify/:id` page.
9. The original upload cleanup worker removes abandoned temporary originals.
10. The OTS worker creates a timestamp proof. Verification status later changes
   from in progress to confirmed.

## 4. Technical Architecture

### Frontend

- Vite, React, TypeScript, Tailwind CSS
- Entry point: `src/main.tsx`
- Homepage and upload flow: `src/App.tsx`
- Certificate page: `src/components/CardGenerator.tsx`
- Public verification page: `src/pages/VerifyPage.tsx`
- Shared certificate renderer: `src/utils/certificateCanvas.ts`
- Supabase client: `src/utils/supabase.ts`

### Backend

- Supabase Auth: email OTP login
- Supabase PostgreSQL: records, credits, orders, activation codes, OTS jobs
- Supabase RLS: restrict direct browser access
- Supabase Edge Functions: privileged operations
- Supabase Storage:
  - `v-id-images`: public avatar images
  - `v-id-ots`: private OTS proof files
  - `v-id-originals`: temporary private original-file uploads
- OTS dispatch: PostgreSQL trigger plus `pg_net` calls `ots-worker`
- Payment: Alipay create-order, query-order, and signed notify functions
- Original cleanup: PostgreSQL cron calls `original-cleanup` for abandoned
  temporary original uploads

### Deployment

- Static frontend deploy: `.github/workflows/deploy.yml`
- Trigger branch: `codex/security-architecture-refactor`
- Build directory: `Vid-full-main`
- Server target: `/srv/www/vaid.top/current`
- Web server configuration: `ops/nginx/vaid.top.conf`

## 5. Naming Rules

- Chinese public label for the generated identifier: `档案编号`
- English public label: `Record ID`
- New Record ID format: `VXX-XXX-XXX`
- Existing historical Record IDs remain valid and queryable.
- Do not silently rename certificate fields or use different labels on the
  certificate page and verification page.

## 6. Rules for Changes

- Make the smallest change that solves the requested problem.
- Do not redesign approved UI without explicit user approval.
- Do not change certificate canvas coordinates, font sizes, field positions,
  QR-code position, or visual assets without explicit user approval.
- Keep certificate-page and verification-page rendering on the shared
  `certificateCanvas.ts` path.
- Do not remove backward compatibility for existing Record IDs.
- Add database changes as new migrations. Do not rewrite applied migrations.
- Do not add dependencies unless the existing stack cannot solve the problem.
- Remove only dead code created by the current change. Report unrelated cleanup
  candidates separately.

## 7. Security Requirements

- Never expose `SUPABASE_SERVICE_ROLE_KEY`, Alipay private keys, Resend keys,
  deploy SSH keys, or internal worker secrets to frontend code or Git.
- Treat the Supabase anon key as public. Security must rely on RLS and backend
  authorization, not secrecy of the anon key.
- Privileged writes must go through Edge Functions and service-role RPCs.
- Certificate registration must remain atomic: validate original file hash,
  consume one credit, create one record, and insert one OTS job.
- Alipay settlement must verify signature, app ID, seller identity, amount,
  order ownership, and idempotency.
- Public verification must expose only product-approved public fields.
- Original uploaded files are private and temporary. Keep retention and cleanup
  behavior explicit.
- Creator identity-document numbers must be encrypted at rest and must never be
  exposed through public verification data, browser storage, or logs.
- Creator country must use an ISO country code. Only document types with an
  implemented country-specific format validator may be accepted by the
  frontend and `creator-identity-register`; unsupported combinations fail
  closed.
- Logs must not print secrets, raw payment callback payloads, personal data, or
  original-file contents.
- User-facing copy must not claim copyright registration, ownership
  determination, notarization, judicial certification, or guaranteed legal
  validity.

## 8. Areas That Require Explicit Approval

- Homepage hero layout and promotional modal
- Mobile and desktop visual layout
- Certificate renderer visuals and field labels
- Public verification fields
- Credit quantities, free-trial rules, and prices
- Record ID format
- Privacy and legal copy
- Storage retention rules
- Payment behavior
- Production deployment, DNS, and database migrations

## 9. Required Verification After Development

Run:

```bash
npm run typecheck
npm run lint
npm run build
```

For backend or security changes, also verify:

- Anonymous users cannot read private tables.
- A user cannot read another user's orders or private records.
- Direct browser writes cannot bypass Edge Functions.
- Certificate generation consumes exactly one credit.
- OTS jobs are created and eventually confirmed.
- Payment callbacks remain idempotent.
- Homepage and verification pages return the expected security headers.

## 10. Development Record Format

Create a short note in `docs/` for production-impacting changes:

```text
# VAID Development Record - <Topic>

Date:
Commit:

## Goal

## Files Changed

## Database or Environment Changes

## Security Impact

## Verification Performed

## Deployment Status

## Rollback Notes
```
