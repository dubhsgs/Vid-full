# VAID Auth + Security Refactor Draft - 2026-05-02

## Status

This is a planning draft only. No production database migration has been executed.

The companion SQL draft is:

```text
docs/draft_auth_security_migration_2026-05-02.sql
```

It is intentionally stored under `docs/`, not `supabase/migrations/`, so Supabase CLI will not treat it as an executable migration.

## Why this draft exists

The project currently works visually and passes local checks, but the existing architecture leaves critical business actions too close to the frontend:

- anonymous users can insert into `v_ids`
- quota is tied to frontend-supplied `client_id`
- payment order query is tied to `out_trade_no` instead of a trusted user owner
- `ots-stamp` trusts frontend-submitted `sha256_hash`
- image upload/storage is not yet account-owned

The target architecture is:

```text
Supabase Auth required for generation
credits tied to user_id
orders tied to user_id
certificates tied to user_id
public verification through public_v_ids view
certificate registration through v-id-register Edge Function
quota + v_ids insert through Postgres RPC transaction
OTS through internal ots_jobs queue
online payment directly adds account credits
activation codes redeem into account credits only
```

## UI preservation requirement

The user has confirmed the current UI is normal and must be preserved.

This draft intentionally does not propose visual changes. Future implementation must avoid changing current layout, typography, colors, Hero/HUD visuals, responsive behavior, or localized title layout unless the user explicitly approves.

## Final product/security decisions

The user confirmed these decisions before implementation:

1. `public_v_ids` should publicly expose `image_url` because verification needs to show the certificate image.
2. `sha256_hash` should be fully public because it is the basis of independent verification.
3. `sha256_hash` must mean the original uploaded file byte hash, not a metadata hash.
4. Free credits are available only after email verification.
5. Unverified users may preview, but cannot write to the registry or download a formal certificate.
6. In-site Alipay payment should directly add account `paid_credits`.
7. Activation codes stay only for gift cards, offline distribution, third-party channels, or support cases.
8. OTS first version should use a Supabase Database Webhook on `ots_jobs` insert, with a scheduled retry fallback.
9. Legacy records may be claimed only by proving the original file hash, never by knowing `friendly_id` alone.

## Existing schema facts observed locally

### `v_ids`

Current table originated with:

- `id uuid primary key`
- `character_name text not null`
- `creator_name text not null`
- `sha256_hash text unique not null`
- `image_url text`
- `created_at timestamptz`
- `updated_at timestamptz`

Later additions:

- `friendly_id text unique`
- `ots_status text not null default 'pending'`
- `ots_file_path text`
- `original_file_hash text`

Current risk:

- public/anon insert policy exists through older migrations.

### `user_quotas`

Current table is client/browser based:

- `client_id text primary key`
- `remaining_credits integer default 3`
- `total_used integer default 0`

Current risk:

- `client_id` is frontend-supplied and can be rotated.

### `alipay_orders`

Current table is also client/browser based:

- `out_trade_no text unique`
- `trade_no text unique`
- `client_id text not null`
- `pack_size integer`
- `amount numeric`
- `status text`
- `license_key text` added later

Current risk:

- order ownership is not tied to authenticated `user_id`.

### `license_keys`

Current model supports activation codes with remaining uses.

Target model:

- keep activation codes for gift/offline/third-party scenarios
- redeem activation code into account `paid_credits`
- do not use activation code as the default in-site purchase result

### Storage

Current `v-id-images` bucket:

- public read
- 5MB bucket limit
- allowed MIME list
- currently allows anon/authenticated upload to `avatars/`

Target model:

- authenticated uploads only
- path convention: `avatars/{user_id}/{uuid}.jpg`
- backend validates path ownership before registration

## Proposed migration pieces

### 1. Auth-owned tables

Create:

- `profiles`
- `user_credits`

`user_credits` replaces the browser-client quota model for the secure generation flow.

Fields:

- `user_id`
- `free_credits`
- `paid_credits`
- `total_used`
- timestamps

### 2. Auth user trigger and verified-credit initialization

Add trigger on `auth.users`:

- create/update `profiles`

Do not unconditionally create free credits on raw user insert.

Free credits are created only for confirmed-email users:

- confirmed users can receive `3` free credits
- `v-id-register` / `register_v_id` must reject users whose `email_confirmed_at` is null
- if a confirmed user has no `user_credits` row yet, the RPC may lazily create it with 3 free credits

### 3. `v_ids.user_id`

Add owner column:

```sql
user_id uuid references auth.users(id) on delete set null
```

New records should always have `user_id`.

Legacy records keep `user_id = null` and remain public verification records only.

### 4. `public_v_ids` view

Expose only verification-safe fields:

- `friendly_id`
- `character_name`
- `creator_name`
- `sha256_hash`, fully public, representing the original file byte hash
- `image_url`, public certificate image URL
- `created_at`
- `ots_status`
- `ots_file_path`

Hidden:

- `user_id`
- `client_id`
- payment fields
- audit fields
- activation code fields

Do not store signed/private Storage URLs in `image_url`; signed URLs expire and should not become permanent certificate records.

### 5. Direct `v_ids` write lockdown

Drop old public insert policies:

- `Anyone can register new V-IDs`
- `Anyone can register new V-IDs with valid data`

Keep owner read for authenticated users.

Do not allow direct public/authenticated insert/update/delete.

### 6. `ots_jobs`

Create internal queue table:

- `id`
- `friendly_id`
- `status`
- `attempt_count`
- `last_error`
- lock/process timestamps

OTS worker should process this queue and use database `sha256_hash`, not frontend hash.

First-version trigger strategy:

- insert `ots_jobs` inside `register_v_id`
- configure Supabase Database Webhook on `ots_jobs` INSERT
- webhook calls the OTS worker Edge Function
- worker reads `sha256_hash` from `v_ids`
- scheduled retry handles `failed` and stale `pending` / `processing` jobs

### 7. `register_v_id` RPC

Core atomic mutation:

1. validate user id and fields
2. validate SHA-256 format
3. check duplicate hash before credit consumption
4. lock `user_credits` row with `FOR UPDATE`
5. consume free credit first, paid credit second
6. insert `v_ids`
7. insert `ots_jobs`
8. return confirmed `friendly_id` and remaining credits

Important hash rule:

- `sha256_hash` must be original uploaded file byte hash.
- If certificate metadata needs a future hash, create a separate `certificate_hash`; do not overload `sha256_hash`.

Reason:

- Edge Function multi-step calls do not guarantee ACID transaction across separate API calls.
- Postgres function keeps quota deduction and certificate creation in one transaction.

### 8. `v-id-register` Edge Function

Local implementation status:

- Implemented locally in `supabase/functions/v-id-register/index.ts`.
- It requires Authorization JWT and email confirmation.
- It never trusts frontend-provided `user_id`.
- It calls `register_v_id` RPC with service role.
- It returns the backend-created or duplicate `friendly_id` plus current credits.
- Remaining frontend cutover still needs Auth UI/session and upload-path changes.

### 9. Payment ownership

Add `alipay_orders.user_id`.

New order flow:

- user must be logged in
- create order with current `user_id`
- query order only if current user owns order
- online paid order directly adds credits to `user_credits.paid_credits`

Draft includes a new function name:

```text
mark_alipay_order_paid_to_credits
```

Local implementation status:

- `alipay-create-order` now requires Auth and writes `alipay_orders.user_id`.
- `alipay-query-order` now requires Auth, checks order ownership, returns no `license_key`, and calls `mark_alipay_order_paid_to_credits`.
- `alipay-notify` now calls `mark_alipay_order_paid_to_credits`.
- Frontend payment UI/success-page cutover is still pending because it may require user-visible login/account changes.

### 10. Activation code redemption

Draft adds:

- `license_keys.redeemed_by_user_id`
- `license_keys.redeemed_at`
- `redeem_license_key_to_credits(p_key, p_user_id)`

This changes activation codes into account-credit redemption tokens.

### 11. Storage policy

Target path:

```text
avatars/{user_id}/{uuid}.jpg
```

Draft replaces anonymous avatar upload with authenticated owner-path upload.

Product decision:

- public image read stays enabled for certificate verification images
- do not store signed/private Storage URLs in permanent certificate rows

## Required implementation order after draft approval

1. Confirm production schema with precheck SQL.
2. Review the local candidate migration `supabase/migrations/20260502093000_auth_security_refactor.sql`.
3. Implement Auth UI while preserving current visual style. This requires user approval before visual edits.
4. Update frontend generation flow to call `v-id-register`, not direct `v_ids` insert.
5. Update image upload path to `avatars/{user_id}/{uuid}.jpg`.
6. Update frontend payment and success flow to use account credits, not default activation-code delivery.
7. Configure Supabase Database Webhook on `ots_jobs` insert to call `ots-worker`.
8. Add scheduled OTS retry for failed/stale jobs.
9. Add rate limits and audit logging.
10. Apply migration/functions/frontend in a staging or maintenance sequence.
11. Run complete attack simulation.

## Important warnings

- Do not apply this SQL directly without reviewing against production schema.
- Do not deploy database lockdown before frontend and Edge Functions are ready, or certificate generation will break.
- Do not remove legacy verification access for old `v_ids` records.
- Do not change UI while implementing backend flow unless user approves.
- Do not trust frontend `user_id`, `sha256_hash`, `client_id`, `out_trade_no`, or image path.

## Legacy claim flow

Legacy `v_ids` records have no `user_id`. They may be claimed only with original-file hash proof.

Recommended claim flow:

1. User logs in and has verified email.
2. User uploads the original file.
3. Backend verifies or computes the original file SHA-256 hash.
4. User submits `friendly_id` and verified hash to `claim-vid`.
5. Backend checks record exists.
6. Backend checks `v_ids.user_id IS NULL`.
7. Backend checks `v_ids.sha256_hash` matches the verified file hash.
8. Backend writes `user_id`.
9. Backend writes an audit log row.

Rules:

- knowing `friendly_id` is never proof of ownership
- already-owned records cannot be claimed again
- failed and successful claim attempts should be logged

## Resolved decisions

1. `public_v_ids` includes `image_url`.
2. Full `sha256_hash` is public.
3. Free credits require email confirmation.
4. In-site payment directly adds account credits.
5. Activation codes remain for optional redemption channels only.
6. OTS first version uses Database Webhook on `ots_jobs`, plus scheduled retry.
7. Legacy records can be claimed only by proving matching original file hash.
