# Session Memory - 2026-05-02

## Purpose of this file

This file records the current VAID project state, the security and architecture problems discovered on 2026-05-02, the external Gemini review conclusions, and the agreed next direction.

Use this file as the future reference point before making architecture, payment, authentication, quota, certificate-generation, OTS, or database-permission changes.

## Current project context

- Active project path: `/Users/yan/Documents/VAID/Vid-full-main`
- Current local website URL used during the session: `http://127.0.0.1:5175/?v=mobile-text-container-12`
- Product: VAID / V-ID digital identity and proof-of-existence certificate site.
- Core product flow:
  - user uploads a character / asset image
  - user enters character name and creator name
  - frontend generates a visual certificate
  - record is stored in Supabase `v_ids`
  - QR / verification URL points to `/verify/{friendly_id}`
  - payment and activation-code / quota flow controls additional generation rights
  - OTS functions are used for hash timestamping / proof files

## Current local git / file state snapshot

As of 2026-05-02 10:08 CST, local worktree was dirty.

Modified tracked files:

- `SESSION_MEMORY_2026-04-17.md`
- `src/App.tsx`
- `src/components/LanguageSwitcher.tsx`
- `src/components/PaywallModal.tsx`
- `src/i18n/config.ts`
- `src/index.css`

Staged + unstaged status existed for:

- `src/i18n/config.ts`
- `src/index.css`

Untracked files / folders included:

- `../.DS_Store`
- `docs/`
- `public/footer_circuit.png`
- `public/hero-background-video.mp4`
- `public/vaid-logo-top.jpeg`
- `public/vaid-logo-top.png`
- `screenshots-mobile-segments/`
- `vaid-fullpage-mobile-tight-2.png`
- `vaid-mobile-fullpage-clean.png`
- `vaid-mobile-fullpage-fixedscroll.png`
- `vaid-mobile-fullpage-stitched.png`

Important: do not assume current UI/security work is committed. Check `git status` before future changes.

## Recent UI state before security discussion

The recent active work before this security planning phase was homepage Hero / HUD UI tuning.

Important UI facts:

- Desktop and mobile Hero text layouts had been separately tuned.
- User explicitly required certain phases to modify only text size / layout and not unrelated UI properties.
- Chinese desktop Hero title was adjusted to:
  - `您的数字资产永久存证`
  - `将数字灵魂锚定`
  - `物理世界`
- Chinese mobile Hero title was adjusted to:
  - `您的数字资产永久存证`
  - `将数字灵魂锚定物理世界`
- Mobile Chinese subtitle was adjusted so the mobile line break occurs around `不可篡改的数字记录。`, while desktop remains separate.
- Japanese Hero title had been enlarged across multiple iterations.
- HUD decorative slash elements were tuned toward a darker blue tone.
- Top-left HUD neon effect was strengthened.
- A background video asset was introduced as `public/hero-background-video.mp4` but remains untracked at this snapshot.

Future security refactor should avoid accidental visual regressions. UI changes should be isolated from security architecture changes unless explicitly requested.

## Generated external-review documents

A document for Gemini / external review was generated in:

- `docs/VAID_architecture_security_review_for_gemini_2026-05-02.md`
- `docs/VAID_architecture_security_review_for_gemini_2026-05-02.pdf`

PDF issue and fix:

- First PDF version showed black blocks in Chinese code blocks because code blocks used `Courier`, which did not support Chinese glyphs.
- PDF was regenerated with Chinese-capable font for code blocks.
- Verified PDF result:
  - 20 pages
  - text extraction works
  - no black square character detected in extracted text

## Validation performed before architecture decision

Code quality / build checks performed:

- `npm run lint`: passed
- `npm run typecheck -- --pretty false`: passed
- `npm run build -- --outDir /private/tmp/vaid-build-check --emptyOutDir`: passed

Build warning:

- Main JS chunk was about `541.85 kB`, above Vite's default `500 kB` warning threshold.
- This is a performance concern, not the primary security blocker.

Dependency audit:

- `npm audit --audit-level=moderate` completed after network access was allowed.
- Result: 16 vulnerabilities.
  - 6 high
  - 9 moderate
  - 1 low
- Affected packages included build-chain and tooling packages such as:
  - `rollup`
  - `glob`
  - `minimatch`
  - `picomatch`
  - `cross-spawn`
  - `flatted`
  - `esbuild`
  - `vite`
  - `postcss`
  - `js-yaml`
  - `yaml`
  - `nanoid`

External review agreed that high-severity dependency issues should be treated as an上线 blocker for a payment-related project.

## Main security and architecture findings

### Finding 1: `v_ids` can be anonymously inserted

Current issue:

- Supabase RLS policy allows anon/public insertion into `v_ids` as long as basic fields are non-empty and `sha256_hash` length is 64.
- The frontend Supabase anon key is public by design.
- Therefore, an attacker can bypass the UI and directly call Supabase REST API to insert certificate records.

Risk:

- Bypasses free quota.
- Bypasses paid generation.
- Bypasses activation-code flow.
- Allows spam records.
- Allows hash / friendly_id pollution or possible hash preemption.
- Weakens trust in public verification records.

Root cause:

- Certificate registration is still a frontend-controlled operation.
- Database permissions still allow public write access to a critical business table.

Required direction:

- Frontend must stop direct `v_ids` inserts.
- `v_ids` anonymous INSERT must be closed.
- Certificate creation must go through a trusted backend path.

### Finding 2: `ots-stamp` can be forged / abused

Current issue:

- `ots-stamp` accepts `friendly_id` and `sha256_hash` from the request body.
- It uses service role credentials to upload OTS proof and update `v_ids`.
- It does not force the hash to come from the database record.

Risk:

- A caller who knows a `friendly_id` can submit an arbitrary hash.
- OTS file and status can be overwritten or polluted.
- Proof-of-existence trust model is weakened.

Required direction:

- `ots-stamp` must not trust frontend-provided `sha256_hash`.
- It should read the real hash from `v_ids` by `friendly_id` or task ID.
- Prefer internal/asynchronous invocation from backend registration flow.

### Finding 3: payment order query can leak license / activation rights

Current issue:

- `alipay-query-order` primarily accepts `out_trade_no`.
- Payment success flow can query order by order number and receive order data that may include `license_key`.
- No formal user identity binding exists in the current architecture.

Risk:

- Anyone with a valid order number may query order state and possibly obtain activation rights.
- Order number may leak via URL, screenshots, logs, browser history, or referrer.

Required direction:

- Payment orders must bind to `user_id`.
- Order query must verify current authenticated user owns the order.
- Sensitive order fields / activation codes must not be returned to non-owners.

### Finding 4: free quota can be minted by changing `client_id`

Current issue:

- `quota-check` and `quota-use` trust frontend-provided `client_id`.
- If no quota row exists for that `client_id`, the backend creates one with free credits.
- Attackers can rotate `client_id` to repeatedly obtain free quota.

Risk:

- Free quota cannot be reliably enforced.
- Can generate unlimited records if combined with the current public `v_ids` insert issue.
- Can increase storage, OTS, and Edge Function costs.

Required direction:

- Quota must bind to authenticated `user_id`, not frontend-supplied `client_id`.
- If temporary guest mode exists, it can only be treated as a soft anti-abuse layer, not a secure entitlement system.

### Finding 5: frontend can show certificate success after DB insert failure

Current issue:

- In `CardGenerator.tsx`, after certain database insert failures, the UI can still set `citizenId` and QR content using the locally generated serial ID.
- This can show a certificate even when `v_ids` has no corresponding database record.

Risk:

- User sees a certificate that cannot be verified.
- Quota may already have been consumed.
- Business state becomes inconsistent.

Required direction:

- Generation must only show success after backend confirms the record exists.
- Quota deduction and record creation must be atomic or compensating.

### Finding 6: runtime CDN import of JSZip

Current issue:

- Code imports JSZip at runtime from `https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm`.
- This exists in certificate download / verification download flows.

Risk:

- CDN outage breaks download functionality.
- CDN compromise becomes frontend code execution risk.
- Current `vercel.json` lacks a strong Content-Security-Policy.

Required direction:

- Add `jszip` as a local dependency.
- Import it through the build pipeline.
- Add CSP headers.

### Finding 7: dependency vulnerabilities

Current issue:

- `npm audit` reports 16 vulnerabilities, including 6 high.

Risk:

- Many are build-chain vulnerabilities, but this still matters for a payment-related project.
- Compromised build tooling can lead to malicious output artifacts.

Required direction:

- Run `npm audit fix` where safe.
- Manually upgrade remaining packages if needed.
- Re-run lint, typecheck, build, and manual flows.

### Finding 8: large image upload can freeze browser

Current issue:

- Image upload uses `FileReader.readAsDataURL(file)` before file-size validation.
- Compression happens later.

Risk:

- Huge images can be loaded into memory.
- Mobile browsers may freeze or crash.

Required direction:

- Check file size before reading.
- Check MIME type before reading.
- Enforce front-end and back-end upload limits.

### Finding 9: `supabase/.temp/*` tracked by git

Current issue:

- Supabase temporary metadata files are tracked, including items such as pooler URL / project ref files.

Risk:

- Project metadata leaks into git history.
- Not necessarily secret by itself, but poor security hygiene.

Required direction:

- Add `supabase/.temp/` to `.gitignore`.
- Remove tracked temp files from git index.
- Do not print secrets in chat or documents.

## External Gemini review conclusions

Gemini agreed with the core diagnosis:

- The biggest problem is frontend authority being too large.
- Critical operations should move to backend-controlled functions.
- Supabase Auth is the right foundation for a complete fix.
- `v-id-register` should rely on Postgres RPC for transaction safety.
- `v_ids` public access should use a restricted view, not direct table exposure.
- Online purchases should preferably add account credits directly.
- Activation codes should be reserved for gift-card / offline / third-party distribution scenarios.
- OTS should run asynchronously through an internal jobs table and worker function.
- Cloudflare rate limiting is recommended for real-payment launch.
- Dependency high vulnerabilities are上线 blockers.

Gemini also raised an additional expert question:

- Has the project planned protection for `sha256_hash` collision / fake hash submission and malicious large-file / Storage quota abuse?

Answer / decision recorded:

- Practical SHA-256 collision is not the primary risk.
- The real risk is trusting a frontend-provided hash.
- Best long-term approach: backend should verify or compute the hash from the uploaded file.
- Storage quota abuse must be handled with front-end limits, Storage policies, backend validation, and per-user quota rules.

## Final architecture direction agreed in principle

The project should move from:

```text
Frontend directly controls core business operations.
Database accepts important writes from anon role.
Edge Functions trust frontend-submitted identity / hash / order fields.
```

to:

```text
User is authenticated by Supabase Auth.
Frontend only submits requests and displays results.
Edge Functions verify JWT and user ownership.
Postgres RPC handles atomic business mutations.
Database RLS prevents public writes to critical tables.
Public verification reads from a restricted view.
OTS runs from trusted database state, preferably asynchronously.
Payment and credits bind to user_id.
```

## Product decision: login requirement

Decision recommended by both reviews:

- Require login before certificate generation.
- Do not support anonymous guest certificate generation in the long-term secure architecture.

Reason:

- Guest generation requires IP / fingerprint / `client_id` handling.
- This is bypassable and creates extra non-standard logic.
- Authenticated `user_id` provides traceability and a stable account quota model.

Preferred auth method:

- Email login / magic link / email-password.
- Avoid SMS login at first due to cost and abuse complexity.

## Proposed new database objects

### `profiles`

Purpose:

- User profile metadata linked to Supabase Auth user.

Expected fields:

- `id uuid primary key references auth.users(id)`
- `email text`
- `created_at timestamptz`
- `updated_at timestamptz`

### `user_credits`

Purpose:

- Account-level entitlement / quota ledger.

Expected fields:

- `user_id uuid primary key references auth.users(id)`
- `free_credits integer not null default 3`
- `paid_credits integer not null default 0`
- `total_used integer not null default 0`
- `created_at timestamptz`
- `updated_at timestamptz`

Notes:

- Free credits should activate after email confirmation if possible.
- Free credits are tied to account, not `client_id`.
- Multiple email account abuse remains possible; handle with rate limiting / disposable email blocking / abuse monitoring.

### `v_ids` changes

Add:

- `user_id uuid references auth.users(id)`

Expected model:

- New records have `user_id`.
- Legacy records may have `user_id` null.
- Public verification should not expose full table directly.

### `public_v_ids` view

Purpose:

- Public verification page reads from this view instead of the full `v_ids` table.

Recommended public fields:

- `friendly_id`
- `character_name`
- `creator_name`
- `sha256_hash`
- `ots_status`
- `ots_file_path` if safe / necessary
- certificate issuance timestamp if already public

Recommended hidden fields:

- `user_id`
- `original_file_hash` if considered private
- internal storage path if sensitive
- audit IDs
- payment fields
- `client_id`
- order numbers
- any license / activation-code fields

Open decision:

- Whether `image_url` should be public. If images are part of public certificate verification, it may be public; if copyright/privacy-sensitive, hide it or use controlled display logic.

### `alipay_orders` changes

Add:

- `user_id uuid references auth.users(id)`

Expected behavior:

- `alipay-create-order` requires login.
- Order is created for current `user_id`.
- `alipay-query-order` verifies current `user_id` owns the order.
- Non-owner cannot receive order details or credits / activation code.

### `ots_jobs`

Purpose:

- Internal asynchronous OTS queue.

Expected fields:

- `id uuid primary key`
- `friendly_id text`
- `status text` such as `pending`, `processing`, `stamped`, `failed`
- `attempt_count integer`
- `last_error text`
- `created_at timestamptz`
- `updated_at timestamptz`
- `processed_at timestamptz`

Expected behavior:

- `v-id-register` or RPC creates an `ots_jobs` row after successful certificate registration.
- Worker function processes jobs using database hash, not frontend hash.
- Failed jobs can retry.

## Proposed core backend functions / RPC

### `v-id-register` Edge Function

Purpose:

- Single backend entrypoint for certificate generation.

Responsibilities:

1. Read Authorization header.
2. Verify JWT via Supabase Auth.
3. Get authenticated `user_id`.
4. Validate request fields.
5. Validate uploaded image path belongs to current user.
6. Verify or compute hash.
7. Call `register_v_id` Postgres RPC.
8. Return confirmed `friendly_id` and certificate data.
9. Never trust frontend-submitted `user_id`.

### `register_v_id` Postgres RPC

Purpose:

- Atomic mutation for quota deduction and certificate insertion.

Recommended logic:

1. Lock current user's `user_credits` row using `SELECT ... FOR UPDATE`.
2. Check available credits.
3. Check duplicate `sha256_hash` / uniqueness policy.
4. Deduct credits.
5. Insert `v_ids` record.
6. Insert `ots_jobs` row or mark OTS pending.
7. Return inserted record info.
8. If any step fails, rollback the transaction.

Reason:

- Edge Function multi-step Supabase calls do not provide full ACID guarantees across calls.
- Database RPC is better for preventing race conditions and partial success.

### `ots-stamp` / OTS worker

Purpose:

- Process pending OTS jobs from database state.

Responsibilities:

1. Pick pending job.
2. Load `v_ids` record by `friendly_id`.
3. Use database `sha256_hash`.
4. Generate OTS proof.
5. Upload proof file.
6. Update `v_ids.ots_status` and `ots_file_path`.
7. Update job state.

Forbidden behavior:

- Do not accept frontend-provided `sha256_hash` as authoritative.
- Do not allow arbitrary public callers to overwrite OTS state.

## Payment / activation-code future model

Preferred payment behavior:

- Online in-site payment should directly add credits to the user's account.
- Payment success page should say: payment successful, credits added to account.
- Payment success page should not rely on frontend URL parameters to decide success.
- It should call backend order query / sync, and backend should verify user ownership.

Activation-code positioning:

- Keep activation codes only for:
  - gift cards
  - offline distribution
  - third-party sales channels
  - manual support scenarios
- Activation code use should redeem credits into the logged-in user's account.
- After redemption, mark code as redeemed and bind it to `redeemed_by_user_id`.
- Do not use activation codes as the normal post-payment in-site entitlement mechanism.

## Upload / Storage protection plan

Threats:

- Huge files can freeze browser or increase bandwidth/storage cost.
- User may try to upload unsupported content types.
- User may try to reference another user's image path.
- Frontend hash can be fake if not verified against the uploaded file.

Required controls:

1. Frontend checks before `FileReader.readAsDataURL`:
   - file size limit
   - MIME type allowlist
   - visible error message
2. Storage path includes `user_id`:
   - example: `avatars/{user_id}/{uuid}.jpg`
3. Storage policy restricts upload/read/update/delete by path ownership.
4. Backend verifies image path belongs to current user before certificate registration.
5. Backend verifies file metadata:
   - size
   - MIME type
   - expected extension if relevant
6. Optional stronger model:
   - backend downloads or reads uploaded file from Storage and computes SHA-256 itself.
   - if frontend computes hash for UX, backend still verifies it.
7. Per-user storage quota should be added later:
   - max number of uploaded files
   - max total bytes
   - max registration attempts per time window

## RLS design direction

### `v_ids`

Desired RLS behavior:

- Public verification reads from `public_v_ids`, not full table if possible.
- No anonymous INSERT.
- No anonymous UPDATE.
- No anonymous DELETE.
- Authenticated users may read their own full records if needed.
- Authenticated users should not directly insert core records; registration should go through backend RPC / Edge Function.
- System updates such as OTS status use service role / controlled backend function.

### `user_credits`

Desired RLS behavior:

- User can read own credit balance.
- User cannot directly update credits.
- Credit mutations happen through RPC / backend functions.

### `alipay_orders`

Desired RLS behavior:

- User can read own order status where safe.
- Sensitive fields should not be exposed unnecessarily.
- Order creation and settlement happen through backend functions.
- Non-owner cannot read order details.

### `ots_jobs`

Desired RLS behavior:

- Not public.
- Backend/service role only.
- Optional owner may read friendly status through `v_ids` or a safe view, not raw job internals.

## Cloudflare / rate limiting decision

External review recommends Cloudflare for real-payment launch.

Reason:

- Payment order creation, order query, activation-code redemption, certificate registration, and OTS endpoints are abuse targets.
- Supabase and Vercel have baseline protections but not enough flexible route-specific rate limiting for this risk profile.

Initial practical plan:

- Implement database-level audit and simple rate limits first if Cloudflare is not immediately configured.
- Before real public paid launch, add Cloudflare rate limiting rules for:
  - certificate registration endpoint
  - payment order creation
  - payment order query
  - activation-code redeem
  - OTS worker trigger if public-facing at all

## Legacy data handling

Decision recommended:

- Preserve existing old `v_ids` as legacy public verification records.
- Do not automatically assign old records to new users.

Reason:

- Old records do not have reliable `user_id` ownership.
- Forced claiming could allow impersonation or record theft.

Possible future claim process:

- User proves ownership by providing original file.
- System recomputes hash and matches legacy `sha256_hash`.
- Additional manual review may be required.
- If approved, record may be linked to user account.

Until then:

- Legacy records remain publicly verifiable only.
- They should not give account ownership rights by default.

## Recommended implementation order

### Phase 0: branch / safety setup

1. Check current `git status`.
2. Preserve existing UI state.
3. Create a dedicated security refactor branch.
4. Avoid mixing UI pixel tuning and backend security refactor in one commit.
5. Keep rollback points before migrations.

### Phase 1: dependency and hygiene blockers

1. Run and apply safe `npm audit fix`.
2. Manually upgrade remaining vulnerable packages if needed.
3. Replace CDN JSZip with local package import.
4. Add basic CSP in `vercel.json`.
5. Add `supabase/.temp/` to `.gitignore`.
6. Remove `supabase/.temp/*` from git index.
7. Re-run lint, typecheck, build.

### Phase 2: Auth foundation

1. Enable / confirm Supabase Auth settings.
2. Implement login / logout UI.
3. Require login before certificate generation.
4. Add `profiles` table.
5. Add `user_credits` table.
6. Decide email confirmation requirement for free credits.

### Phase 3: database schema and RLS

1. Add `user_id` to `v_ids`.
2. Add `user_id` to `alipay_orders`.
3. Create `public_v_ids` view.
4. Create `ots_jobs` table.
5. Update RLS policies:
   - close anonymous `v_ids` writes
   - restrict credits mutation
   - restrict order access by owner
   - keep verification read safe

### Phase 4: core registration path

1. Create `register_v_id` Postgres RPC.
2. Use `SELECT ... FOR UPDATE` on `user_credits`.
3. Check credit balance and duplicate hash.
4. Deduct credit and insert `v_ids` atomically.
5. Insert OTS job in the same transaction.
6. Create `v-id-register` Edge Function.
7. Frontend calls `v-id-register`, not direct `v_ids` insert.
8. UI only shows success after backend returns confirmed record.

### Phase 5: payment refactor

1. `alipay-create-order` requires authenticated user.
2. Create order with `user_id`.
3. `alipay-notify` settles payment and credits the user account.
4. `alipay-query-order` verifies current user owns the order.
5. Payment success page shows account credits updated.
6. Activation code becomes optional redemption flow, not default in-site purchase flow.

### Phase 6: OTS refactor

1. Rewrite OTS flow to use `ots_jobs`.
2. Ensure OTS worker reads hash from `v_ids`.
3. Do not accept frontend `sha256_hash` for stamping.
4. Add retry and failure states.
5. Ensure verification page displays pending / stamped / failed states cleanly.

### Phase 7: upload / storage hardening

1. Add frontend file-size and MIME checks before reading file.
2. Change upload path to include `user_id`.
3. Add Storage policies for path ownership.
4. Backend validates file path and metadata during registration.
5. Consider backend hash verification from Storage object.
6. Add per-user storage limits when possible.

### Phase 8: rate limiting / audit

1. Add audit table or structured logging for critical actions.
2. Log:
   - `user_id`
   - IP if available
   - user agent if available
   - action
   - success/failure
   - error code
   - timestamp
3. Add route-level rate limits.
4. Configure Cloudflare before real paid public launch.

### Phase 9: tests and attack simulation

Minimum test list:

1. Anonymous user cannot generate certificate.
2. Anonymous user cannot insert `v_ids` directly.
3. Logged-in user receives expected free credits.
4. Free credits cannot be consumed concurrently below zero.
5. Duplicate hash behaves deterministically.
6. Database failure does not show certificate success.
7. A user cannot query B user's order.
8. A user cannot obtain B user's activation code.
9. Payment success does not trust URL params alone.
10. Paid credits appear only after backend confirms order settlement.
11. Activation code can be redeemed only once.
12. OTS uses database hash, not request hash.
13. OTS failure leaves record in visible non-fake state.
14. Public verification still works for new records.
15. Public verification still works for legacy records.
16. Uploading oversized image is rejected before FileReader.
17. CDN outage does not affect ZIP download after JSZip local import.
18. `npm run lint` passes.
19. `npm run typecheck -- --pretty false` passes.
20. Production build passes.

## Temporary hardening if full refactor cannot be done immediately

If full Auth migration cannot be completed before a short-term demo, minimum temporary hardening should be:

1. Disable anonymous `v_ids` INSERT.
2. Move `v_ids` insertion into an Edge Function even if still using `client_id` temporarily.
3. Make `ots-stamp` read hash from database only.
4. Add `client_id` binding check to order query.
5. Do not return `license_key` unless client/order ownership checks pass.
6. Block success UI if database insert fails.
7. Add file-size limit before reading image.
8. Replace JSZip CDN import.
9. Fix high audit vulnerabilities.
10. Add basic rate limiting where possible.

Important: this is only a stopgap. It does not replace Auth-based ownership.

## Current final recommendation

Do not continue patching the old architecture indefinitely.

The correct long-term path is:

```text
Supabase Auth required for generation
user_credits tied to user_id
orders tied to user_id
certificates tied to user_id
public verification via restricted view
registration via v-id-register Edge Function
atomic quota + insert via Postgres RPC
OTS via internal async jobs
activation codes redeemed into accounts
Cloudflare/rate limiting before real paid launch
```

## Important future reminders

- Do not expose `.env.local` values, Supabase service role keys, or payment secrets in chat, screenshots, or documents.
- Do not trust frontend-provided `user_id`, `sha256_hash`, `client_id`, `out_trade_no`, or image path without backend validation.
- Do not let anonymous users write to critical business tables.
- Do not assume old records have owners.
- Do not mix visual UI tuning with security refactor unless intentionally scoped.
- Before making migrations, create rollback notes and inspect production schema drift.
- Before real launch with payment, fix high dependency vulnerabilities and set up rate limiting.

## Next immediate action proposed

If user approves implementation, start with:

1. Create a dedicated branch for security refactor.
2. Fix dependency and hygiene blockers.
3. Draft migration SQL for Auth-owned schema:
   - `profiles`
   - `user_credits`
   - `v_ids.user_id`
   - `alipay_orders.user_id`
   - `public_v_ids`
   - `ots_jobs`
4. Draft `register_v_id` RPC.
5. Draft `v-id-register` Edge Function.

Do not execute production database migrations without explicit user approval.

## Non-negotiable UI preservation rule added by user

The current UI is the result of extensive manual tuning and must be treated as protected work.

Hard rule for future work:

- Do not change current UI, layout, spacing, colors, typography, Hero/HUD visuals, mobile/desktop responsive behavior, or localized text layout during security / architecture refactor unless the user explicitly approves it.
- If a future backend/security change might require any visible UI change, explain the expected UI impact to the user before editing.
- Security refactor should be implemented in a way that preserves the existing visual appearance by default.
- UI changes and security changes should be separated into different commits or at least clearly separated in the work summary.
- Before modifying frontend files that contain visual code, identify whether the change is business logic only or visual-impacting.
- If uncertain whether a change affects UI, stop and ask the user before applying it.

Reason:

- The current UI was adjusted through many iterations and should not be accidentally overwritten, reverted, or restyled while solving backend/security issues.

## UI checkpoint confirmation from user

On 2026-05-02, after the first security-preparation changes, the user confirmed that the current UI is normal.

Current browser context at confirmation:

- In-app browser URL shown by user: `http://localhost:5173/`
- User message: `当前UI正常。`

Meaning for future work:

- Treat this moment as the visual checkpoint for the current homepage/UI state.
- Any future Auth, database, payment, quota, OTS, dependency, or security refactor must preserve this UI unless the user explicitly approves visual changes.
- If a future change touches `src/App.tsx`, `src/index.css`, i18n Hero text, `LanguageSwitcher`, `PaywallModal`, or other visual components, verify whether the change is logic-only or UI-affecting before editing.
- If UI changes become unavoidable, warn the user before making them.

## Checkpoint file classification before next architecture phase

Current branch:

- `codex/security-architecture-refactor`

Files related to user-confirmed UI / prior visual work:

- `src/App.tsx`
- `src/index.css`
- `src/i18n/config.ts`
- `src/components/LanguageSwitcher.tsx`
- `src/components/PaywallModal.tsx`
- `public/footer_circuit.png`
- `public/hero-background-video.mp4`
- `public/vaid-logo-top.jpeg`
- `public/vaid-logo-top.png`
- `screenshots-mobile-segments/`
- `vaid-fullpage-mobile-tight-2.png`
- `vaid-mobile-fullpage-clean.png`
- `vaid-mobile-fullpage-fixedscroll.png`
- `vaid-mobile-fullpage-stitched.png`

Files related to first security-preparation pass:

- `.gitignore`
- `package.json`
- `package-lock.json`
- `src/components/CardGenerator.tsx`
- `src/pages/VerifyPage.tsx`
- `src/vite-env.d.ts`
- `vercel.json`
- `supabase/.temp/*` removed from git index only; local files remain

Files related to documentation / memory:

- `SESSION_MEMORY_2026-04-17.md`
- `SESSION_MEMORY_2026-05-02.md`
- `docs/VAID_architecture_security_review_for_gemini_2026-05-02.md`
- `docs/VAID_architecture_security_review_for_gemini_2026-05-02.pdf`

Ignored / local-only hygiene item:

- `../.DS_Store`

Checkpoint caution:

- `src/i18n/config.ts` and `src/index.css` currently have both staged and unstaged changes (`MM`). Before any commit, inspect staged vs unstaged carefully so the final checkpoint does not accidentally split or lose UI work.
- Do not run destructive git commands.
- Do not reset, checkout, or revert UI files without explicit user approval.

## Auth + security database draft created

Created two draft files on 2026-05-02:

- `docs/VAID_auth_security_refactor_draft_2026-05-02.md`
- `docs/draft_auth_security_migration_2026-05-02.sql`

Important safety note:

- The SQL draft is intentionally under `docs/`, not `supabase/migrations/`.
- It is marked `DRAFT ONLY. DO NOT RUN DIRECTLY IN PRODUCTION.`
- No production database migration was executed.

Draft scope:

- `profiles` table
- `user_credits` table
- auth user trigger to create profile and initial credits
- `v_ids.user_id`
- `public_v_ids` restricted verification view
- removal plan for anonymous `v_ids` INSERT policies
- `ots_jobs` internal queue
- `generate_v_id_friendly_id()` helper
- `register_v_id()` Postgres RPC for atomic credit consume + certificate insert + OTS job insert
- `alipay_orders.user_id`
- draft `mark_alipay_order_paid_to_credits()` function for future payment settlement into account credits
- `license_keys.redeemed_by_user_id` and `redeemed_at`
- draft `redeem_license_key_to_credits()` function
- authenticated Storage upload policy for `avatars/{user_id}/{uuid}` paths

Open decisions recorded in the draft:

1. Should `public_v_ids` include `image_url`?
2. Should full `sha256_hash` be public, or masked with full hash only in downloaded proof?
3. Should free credits require email confirmation?
4. Should online purchase stop displaying activation codes immediately, or should there be a transition period?
5. Should OTS jobs be processed by scheduled function, database webhook, or manual worker endpoint in the first version?
6. Should legacy records ever be claimable? If yes, what proof is required?

Next implementation step after user review:

- Do not apply the draft yet.
- First review and answer the open decisions.
- Then convert the draft into a real migration in `supabase/migrations/` only after explicit approval.
- Frontend/Edge Function cutover must be ready before locking down `v_ids` direct writes.

## Final decisions for Auth/security refactor after user answers

The user answered the six open architecture questions and chose the one-step/full refactor direction instead of temporary hardening.

Final decisions:

1. `public_v_ids` should expose `image_url`.
   - Reason: public verification should show the certificate/image; otherwise verification UX loses product value.
   - Constraint: do not store signed/private Storage URLs in permanent records because signed URLs expire.

2. `sha256_hash` should be fully public.
   - Reason: independent verification requires users to compare their own computed hash with the stored hash.
   - Important definition: `sha256_hash` must mean the original uploaded file byte hash, not a metadata hash made from name/creator/image URL.
   - If a metadata/certificate hash is needed later, use a separate name such as `certificate_hash`.

3. Free credits require email confirmation.
   - Unverified users may preview, but cannot write to the registry or download a formal certificate.
   - Do not unconditionally create free credits on raw `auth.users` insert.
   - `register_v_id` should reject users whose `email_confirmed_at` is null.
   - For confirmed users without a `user_credits` row, credits may be lazily initialized by trusted backend/RPC.

4. In-site Alipay payment should directly add account `paid_credits`.
   - Activation codes should not be the default in-site payment result.
   - `license_keys` remain only for gift cards, offline distribution, third-party channels, or support cases.
   - Payment success page should eventually show credits added to the account, not a default activation-code handoff.

5. OTS first version should use Supabase Database Webhook on `ots_jobs` insert.
   - Preferred flow: `register_v_id` inserts `v_ids` and `ots_jobs`; DB webhook on `ots_jobs` calls OTS worker.
   - Worker reads `sha256_hash` from `v_ids`, not from frontend request body.
   - Add scheduled retry later for failed/stale pending or processing jobs.

6. Legacy records may be claimed only by original-file hash proof.
   - Knowing `friendly_id` is not proof because it is public.
   - Claim flow requires login, verified email, original file upload, hash verification, `user_id IS NULL`, and audit logging.
   - Already-owned records cannot be claimed again.

Draft files updated accordingly:

- `docs/VAID_auth_security_refactor_draft_2026-05-02.md`
- `docs/draft_auth_security_migration_2026-05-02.sql`

Notable draft changes made after these decisions:

- `user_credits.free_credits` default changed to `0` in draft.
- Auth trigger now creates/updates profile only, not credits.
- Confirmed users can get 3 free credits via lazy initialization in `register_v_id`.
- `register_v_id` now requires `email_confirmed_at` and uses `sha256_hash` as original file hash.
- `register_v_id` no longer takes separate `p_original_file_hash` parameter in the draft.
- Added `v_id_claim_audit` draft table.
- Added `claim_legacy_v_id` draft RPC.
- Added OTS webhook strategy comments for `ots_jobs`.
- Storage notes now explicitly keep public verification images but forbid signed/private permanent URLs.

No production migration was executed.
No UI changes were made for this decision update.

## Backend security refactor implementation pass - 2026-05-02

Branch:

- `codex/security-architecture-refactor`

User constraint still active:

- Preserve the current UI. The user explicitly does not want visual changes unless warned and approved first.
- This pass intentionally avoided layout, typography, color, hero text arrangement, and visual component redesign.
- One frontend data-source change was made in `src/pages/VerifyPage.tsx`: verification now reads `public_v_ids` instead of direct `v_ids`. This is a security/data-access change, not a visual UI change.

Implemented locally in backend / Supabase code:

- Added shared auth helper `supabase/functions/_shared/auth.ts` with JWT user lookup and email-confirmation helper.
- Added shared OTS helper `supabase/functions/_shared/ots.ts` so OTS stamping validates hashes centrally.
- Reworked `supabase/functions/ots-stamp/index.ts` so it ignores frontend-submitted `sha256_hash` and reads the real hash from `v_ids` by `friendly_id`.
- Added `supabase/functions/v-id-register/index.ts`:
  - requires logged-in, email-confirmed user
  - validates inputs
  - calls Postgres RPC `register_v_id`
  - leaves credit consumption and `v_ids` insertion atomic in the database
- Added `supabase/functions/ots-worker/index.ts`:
  - processes `ots_jobs`
  - loads `sha256_hash` from `v_ids`
  - uploads `.ots` file
  - updates job and `v_ids.ots_status`
- Added `supabase/functions/claim-vid/index.ts`:
  - requires logged-in, email-confirmed user
  - accepts original file upload via `multipart/form-data`
  - computes SHA-256 server-side
  - calls `claim_legacy_v_id`
  - does not accept `friendly_id` alone as ownership proof
- Reworked `supabase/functions/alipay-create-order/index.ts`:
  - no longer trusts frontend `client_id`
  - requires logged-in, email-confirmed user
  - writes `alipay_orders.user_id`
  - stores legacy `client_id` as `user.id` only for schema compatibility
- Reworked `supabase/functions/alipay-query-order/index.ts`:
  - requires logged-in, email-confirmed user
  - checks `alipay_orders.user_id === current user.id`
  - does not return `license_key`
  - settles paid orders through `mark_alipay_order_paid_to_credits`
- Reworked `supabase/functions/alipay-notify/index.ts`:
  - keeps Alipay signature/app/seller/amount checks
  - settles paid orders through `mark_alipay_order_paid_to_credits`
  - no longer expects an activation code to be issued for normal in-site payment
- Reworked `supabase/functions/license-key-use/index.ts`:
  - requires logged-in, email-confirmed user
  - calls `redeem_license_key_to_credits`
  - activation codes now redeem into account `paid_credits`
- Reworked `supabase/functions/license-key-status/index.ts`:
  - now requires logged-in, email-confirmed user before revealing activation-code status
- Reworked `supabase/functions/quota-check/index.ts`:
  - no longer accepts frontend `client_id` as identity
  - requires logged-in, email-confirmed user
  - reads or lazily initializes `user_credits`
- Reworked `supabase/functions/quota-use/index.ts`:
  - now returns `DEPRECATED_USE_V_ID_REGISTER`
  - credit consumption must happen only inside `v-id-register` / `register_v_id`

Implemented locally in migration candidate:

- Created `supabase/migrations/20260502093000_auth_security_refactor.sql` as a local candidate migration.
- This is not deployed and must be reviewed before production.
- Migration includes:
  - `profiles`
  - `user_credits`
  - `v_ids.user_id`
  - `public_v_ids`
  - RLS lockdown for direct `v_ids` writes
  - `ots_jobs`
  - `generate_v_id_friendly_id()`
  - `register_v_id()` atomic RPC
  - `v_id_claim_audit`
  - `claim_legacy_v_id()`
  - `alipay_orders.user_id`
  - `mark_alipay_order_paid_to_credits()`
  - `license_keys.redeemed_by_user_id` / `redeemed_at`
  - `redeem_license_key_to_credits()`
  - authenticated Storage upload policy draft

Verification run after this pass:

- `npm run lint` passed.
- `npm run typecheck -- --pretty false` passed.
- `npm run build -- --outDir /private/tmp/vaid-build-check --emptyOutDir` passed.
- `npm audit --audit-level=moderate` passed with `found 0 vulnerabilities` after network escalation.
- Build still has the known non-blocking chunk-size warning because JSZip is now bundled locally.

Important remaining blockers before real deployment:

1. Frontend Auth UI is not yet implemented.
   - This will require visible UI changes, so the user must be warned/asked before editing.
   - Current product decision: users must log in and verify email before writing certificates, downloading formal certificates, buying credits, or redeeming activation codes.

2. `CardGenerator` still contains old direct `supabase.from('v_ids').insert(...)` local code.
   - This must be replaced with `v-id-register` before production cutover.
   - This is behavior logic, but it depends on Auth UI/session and the migration.

3. `uploadImageToStorage` still uploads to legacy `avatars/{filename}` path.
   - New policy expects `avatars/{user_id}/{uuid}.jpg`.
   - Must be changed during Auth frontend integration.

4. `PaywallModal`, `PaymentSuccessPage`, and `licenseManager` still contain old client-side assumptions.
   - They need logic changes for Auth-backed credits and direct paid-credit top-up.
   - Any visible UI/text changes must be approved first.

5. Production migration has not been applied.
   - Do not run `supabase db push` or deploy Edge Functions until migration order and rollback are reviewed.
   - Recommended order later: backup/precheck -> migration -> deploy Edge Functions -> frontend Auth/cutover -> configure OTS webhook/retry -> production smoke test.

6. OTS Database Webhook and scheduled retry are not configured in Supabase yet.
   - Code is prepared, but dashboard/project configuration is still required.

7. Edge Functions were linted by repo ESLint, but no Deno/Supabase local function runtime test has been run yet.
   - Before deployment, test with Supabase local or a staging project if available.

## Auth UI and frontend cutover pass - 2026-05-02

User-approved UI addition:

- The user allowed starting Auth UI work but asked to be told exactly where the login entry would be added.
- Implemented login entry location: homepage header top-right, directly to the left of the existing language switcher.
- The login entry is intentionally small and uses the same visual scale/style as the language switcher.
- It does not enter the Hero HUD container, does not change Hero title layout, does not move the character image, and does not alter the desktop/mobile hero typography rules.

Frontend Auth implementation:

- Added `src/components/AuthControl.tsx`.
- Uses Supabase Auth Magic Link email login.
- Shows `Login` when signed out.
- Shows shortened email/account state when signed in.
- Account modal shows current email and email verification status.
- Sign-out is available from the same modal.

Frontend security flow changes:

- `src/App.tsx` now blocks certificate generation unless the user is logged in and email-confirmed.
- If not logged in, it opens the login modal and shows a login-required error.
- If email is not confirmed, it opens the account modal and shows an email-verification-required error.
- Generation no longer pre-consumes quota through `quota-use`.
- Frontend only checks account credits before entering the card-generation page.
- Actual credit consumption now happens only in backend `v-id-register` / database `register_v_id`.

Certificate generation cutover:

- `src/components/CardGenerator.tsx` no longer inserts directly into `v_ids`.
- It now calls `supabase.functions.invoke('v-id-register')`.
- It no longer creates a fake local certificate when DB/backend registration fails.
- On registration failure, it stops and shows an error instead of producing an unverifiable certificate.

Storage/upload change:

- `src/utils/imageUpload.ts` now uploads to `avatars/{user_id}/{filename}` when a logged-in user is available.
- This matches the candidate migration's authenticated Storage policy.

Payment frontend changes:

- `src/components/PaywallModal.tsx` no longer sends frontend `client_id` to `alipay-create-order`.
- Return URL no longer includes `cid`.
- `src/pages/PaymentSuccessPage.tsx` no longer expects or displays activation codes for normal in-site payment.
- Payment success copy now indicates credits are added to the VAID account.
- Activation codes remain only as optional redeemable credit channels.

License/quota frontend utility changes:

- `src/utils/licenseManager.ts` now calls `quota-check` without client_id.
- `quota-use` is no longer part of the normal generation flow.
- Activation-code redemption clears saved activation-code state after successful account-credit redemption.
- Order status lookup no longer uses client_id headers.

Validation after this pass:

- `npm run lint` passed.
- `npm run typecheck -- --pretty false` passed.
- `npm run build -- --outDir /private/tmp/vaid-build-check --emptyOutDir` passed.
- Browser visual spot-check at `http://localhost:5173/` confirmed the login button appears in the top-right header beside the language switcher, and the login modal opens without changing the Hero layout.

Still not deployed:

- No production database migration applied.
- No Edge Function deployed.
- No Supabase Auth dashboard configuration verified yet.
- Supabase email templates/redirect URLs still need production setup before real users can log in reliably.

## OTS internalization pass - 2026-05-02

Additional OTS hardening implemented locally:

- Added internal request helper in `supabase/functions/_shared/auth.ts`.
- `ots-worker` now requires `OTS_WORKER_SECRET` via `X-VAID-Internal-Secret` or `X-OTS-Worker-Secret`.
- `ots-stamp` now also requires the same internal secret.
- Frontend `CardGenerator` no longer calls `ots-stamp` directly.
- Expected OTS path is now:
  - `register_v_id` inserts `ots_jobs`
  - Supabase Database Webhook calls `ots-worker`
  - webhook includes `X-VAID-Internal-Secret`

Deployment note:

- Production/staging Edge Function env must include `OTS_WORKER_SECRET`.
- Supabase Database Webhook must send the same value in `X-VAID-Internal-Secret`.
- Without this configuration, OTS jobs will remain pending.

## Auth-owned upload hardening - 2026-05-02

- `src/utils/imageUpload.ts` now refuses to upload if no authenticated Supabase user is present.
- Removed the implicit fallback to legacy anonymous `avatars/{filename}` path.
- Expected new path is always `avatars/{user_id}/{filename}`.
- Re-ran `npm run lint`, `npm run typecheck -- --pretty false`, and production build; all passed.

## Deployment attempt status - 2026-05-02

User said "开始" to proceed toward deployment/preflight.

Completed locally:

- `git status --short` reviewed.
- Edge Function directories exist.
- `.env.local` only contains frontend Supabase URL/anon variables; backend deployment secrets are not present locally.
- `.gitignore` already ignores `*.local`, so `.env.local` is not expected to be committed.
- `npm run lint` passed.
- `npm run typecheck -- --pretty false` passed.
- `npm run build -- --outDir /private/tmp/vaid-build-check --emptyOutDir` passed.

Blocked by environment approval:

- Attempted to run `npx --yes supabase db push --dry-run` for a remote migration preview only.
- The command was rejected by the execution approval layer before running.
- No Supabase cloud connection was made.
- No production database migration was applied.
- No Edge Functions were deployed.

Next required explicit approval/action:

- To continue cloud preflight, run `npx --yes supabase db push --dry-run` from `/Users/yan/Documents/VAID/Vid-full-main`.
- This should preview pending migrations without applying them.
- If dry-run looks correct, only then consider real migration and function deploy commands.

## Production migration executed - 2026-05-06

User explicitly confirmed: "确认执行生产迁移".

Production Supabase project:

- Project ref: `vimglsksvvvnxkjnaqeh`

Pre-migration backup:

- Supabase SQL Editor exported critical table data to CSV.
- Local backup file: `/Users/yan/Documents/VAID/backups/vaid-critical-table-export-20260503-095754.csv`
- Backup contains:
- `public.alipay_orders`: 24 rows
- `public.license_keys`: 6 rows
- `public.user_quotas`: 15 rows
- `public.v_ids`: 149 rows
- `storage.objects` for `v-id-images`: 246 rows

Production database migration:

- Ran `npx --yes supabase db push` from `/Users/yan/Documents/VAID/Vid-full-main`.
- Applied `20260417113000_switch_paid_credits_to_activation_codes.sql`.
- Applied `20260502093000_auth_security_refactor.sql`.
- Supabase CLI finished with `Finished supabase db push`.

Production Edge Functions deployed after migration:

- `quota-check`: active, version 8
- `quota-use`: active, version 9
- `alipay-create-order`: active, version 14
- `alipay-query-order`: active, version 4
- `alipay-notify`: active, version 14
- `license-key-status`: active, version 3
- `license-key-use`: active, version 3
- `v-id-register`: active, version 1
- `claim-vid`: active, version 1
- `ots-worker`: active, version 1
- `ots-stamp`: active, version 1
- `ots-verify`: active, version 1

Local verification after migration:

- Started local Vite dev server at `http://127.0.0.1:5173/`.
- Opened Brave Browser to the local page.
- The page loads and shows the existing VAID hero UI with the new `Login` control.

Important remaining deployment/config tasks:

- Production frontend deployment method is still unresolved because the repo has no git remote and no `.vercel` project link.
- Supabase Auth redirect URL/email settings still need dashboard verification before real users can reliably log in.
- `OTS_WORKER_SECRET` exists in Supabase secrets, but the plaintext value was not retained locally; webhook setup needs either a known rotated value or a secure way to configure the same secret in the Database Webhook header.

## Hosting discovery and mainland cutover prep - 2026-05-06

User requirement reaffirmed:

- Current VAID UI must not be changed during infrastructure work unless explicitly approved first.

Public hosting discovery:

- Aliyun DNS console shows the only domain is `vaid.top`.
- Current public DNS records:
- `@ -> A -> 75.2.60.5`
- `www -> A -> 75.2.60.5`
- This proves the public website is still served through the old Netlify path, not the Aliyun mainland server.

Aliyun server fact:

- Mainland server public IP is `47.93.232.20`.
- Earlier shell inspection showed that server was not yet set up as the live website host.

Local build verification on 2026-05-06:

- Ran `npm run build` in `/Users/yan/Documents/VAID/Vid-full-main`.
- Build succeeded.
- Output confirmed in `dist/`.
- Frontend remains a static Vite build suitable for direct Nginx hosting.

New migration artifacts added:

- `docs/aliyun_cutover_runbook_2026-05-06.md`
- `ops/nginx/vaid.top.conf`

Current migration direction:

- Keep Netlify online temporarily.
- Prepare Aliyun Nginx static hosting first.
- Cut DNS from `75.2.60.5` to `47.93.232.20` only after smoke tests pass.

Aliyun server prep executed on 2026-05-06:

- Installed `nginx` on the Aliyun mainland server.
- Created:
- `/srv/www/vaid.top/current`
- `/var/www/certbot`
- Enabled and started `nginx` with systemd.
- Verified from an external browser that `http://47.93.232.20` now responds with the default HTTP server test page.

Meaning:

- Port 80 is reachable publicly on the mainland server.
- The server is now ready for the next step: replacing the default page with the VAID `dist/` build and applying the custom Nginx config.

## 2026-05-07 production cutover/auth progress checkpoint

Current user requirement:

- The current VAID UI is considered correct.
- Do not change desktop or mobile UI during backend/infrastructure verification.
- If any UI change is necessary later, explain it first and wait for explicit approval.
- Custom SMTP is intentionally postponed to the end.

Completed since the security/auth refactor started:

- Production database migration was applied successfully:
  - `20260417113000_switch_paid_credits_to_activation_codes.sql`
  - `20260502093000_auth_security_refactor.sql`
- Production Edge Functions were deployed:
  - `quota-check`
  - `quota-use`
  - `alipay-create-order`
  - `alipay-query-order`
  - `alipay-notify`
  - `license-key-status`
  - `license-key-use`
  - `v-id-register`
  - `claim-vid`
  - `ots-worker`
  - `ots-stamp`
  - `ots-verify`
- Mainland server is now the active public host for VAID:
  - Aliyun server public IP: `47.93.232.20`
  - Domain: `vaid.top`
  - Domain alias: `www.vaid.top`
- Aliyun DNS has been cut over from the previous Netlify IP to the Aliyun server:
  - `@` A record now points to `47.93.232.20`
  - `www` A record now points to `47.93.232.20`
  - Previous public host path used Netlify IP `75.2.60.5`
- HTTPS is configured and verified:
  - Let's Encrypt certificate was issued for `vaid.top` and `www.vaid.top`.
  - Certificate files are on the server under `/etc/letsencrypt/live/vaid.top/`.
  - Certificate expiry date: `2026-08-05`.
  - Nginx serves HTTPS and redirects HTTP to HTTPS.
  - `certbot-renew.timer` is enabled and active.
  - Certbot renewal dry run passed.
- Server-side public route checks passed:
  - `https://vaid.top/` returns `200`.
  - `https://www.vaid.top/` returns `200`.
  - `https://vaid.top/verify/test` returns `200`.
  - `https://www.vaid.top/verify/test` returns `200`.
  - HTTP verify URLs redirect to HTTPS with `301`.
- Supabase Auth URL configuration was corrected:
  - Site URL is now `https://vaid.top`.
  - Redirect URLs include production root and wildcard URLs for both `vaid.top` and `www.vaid.top`.
  - Local development redirects for `http://localhost:5173` are preserved.
- Supabase Magic Link login now returns to the production website instead of `localhost:3000`.
- User confirmed the core production user path works:
  - Google mailbox receives the login email.
  - Login email link returns to the VAID website.
  - User can log in.
  - User can generate a certificate QR code.
  - Scanning the QR code opens the corresponding verification page.
- Magic Link email template has basic VAID branding:
  - Subject: `VAID 登录链接 / VAID Magic Link`.
  - Body references `VAID Identity Protocol` and `https://vaid.top`.
  - The actual sending service is still Supabase's built-in mail service.

Known remaining issue intentionally postponed:

- Custom SMTP is not configured yet.
- Emails may still show the Supabase sender, for example `Supabase Auth <noreply@mail.app.supabase.io>`.
- QQ mailbox delivery may still be unreliable until custom SMTP and mail-domain reputation are configured.
- This is explicitly postponed until after the remaining backend/security smoke tests.

Remaining verification tasks before considering this phase complete:

- Confirm the latest generated certificate exists in `public.v_ids` and is visible through `public.public_v_ids`.
- Confirm `user_credits` changed correctly after certificate generation.
- Confirm the certificate registration path uses `register_v_id` and does not create fake success after database failure.
- Confirm direct anonymous insert into `public.v_ids` is blocked by RLS/grants.
- Confirm OTS job creation and worker processing:
  - `public.ots_jobs` receives a job after certificate registration.
  - `ots-worker`/`ots-stamp` updates `ots_status` correctly.
  - If Database Webhook is not configured or not using the correct internal secret, configure/fix it later.
- Confirm payment flow after auth refactor:
  - Create order.
  - Query order only for the correct logged-in user/client context.
  - Paid credits are added correctly after confirmed payment.
- Confirm activation-code flow still works for non-site-direct use cases.
- Confirm legacy claim flow with `claim-vid` works for old records without `user_id`.
- Confirm Supabase Function secrets such as `SITE_URL` and `PUBLIC_SITE_URL` point to production URLs where required.

Operational notes:

- Do not store or repeat server passwords in this document.
- The temporary root password used during server setup has been changed by the user.
- Future server access must use the user's current credential or a properly configured SSH key.

## 2026-05-07 production smoke test results

Smoke tests completed without changing UI:

- Production RLS policy check:
  - `public.v_ids` has only one direct policy: authenticated users can SELECT their own records.
  - No anon/authenticated INSERT policy exists on `public.v_ids`.
  - `public.user_credits` can only be SELECTed by the owning authenticated user.
  - `public.ots_jobs` has no public/authenticated policy.
- Production grant check:
  - `anon` has no INSERT/UPDATE/DELETE privilege on `public.v_ids`.
  - `authenticated` has no INSERT/UPDATE/DELETE privilege on `public.v_ids`.
- Direct attacker simulation:
  - Anonymous REST insert into `public.v_ids` returned HTTP `401` with PostgREST error `42501` / `permission denied for table v_ids`.
  - This confirms the old critical bypass, "direct database certificate registration without the website/payment/quota flow", is blocked in production.
- Edge Function anonymous access checks:
  - Anonymous `v-id-register` call returned HTTP `401` / `AUTH_REQUIRED`.
  - Anonymous `quota-check` call returned HTTP `401` / `AUTH_REQUIRED`.
  - Anonymous `ots-worker` call returned HTTP `403` / `FORBIDDEN`.
- Production Auth state:
  - One Gmail user is confirmed and has a recent successful login.
  - One QQ user exists but is not confirmed, matching the known QQ delivery issue.
- Production credit state:
  - The confirmed Gmail user has `free_credits = 3`, `paid_credits = 0`, `total_used = 0`.
  - This means the login/credit initialization path works, but no new unique certificate has consumed credit yet.
- Production certificate state:
  - `public.v_ids` currently has 149 records.
  - `owned_v_ids = 0` and `legacy_v_ids = 149`.
  - The newest visible records are still from April 2026, so no new Auth-owned certificate has been persisted yet.
- Production public verification view:
  - `public.public_v_ids` returns the same legacy records and remains usable for verification-page reads.
- Production OTS state:
  - `public.ots_jobs` currently has 0 rows.
  - This is expected if no new unique Auth-owned certificate has been registered after the migration.
- Safe transaction rollback test:
  - A temporary `register_v_id` call inside `BEGIN ... ROLLBACK` successfully produced a pending OTS job inside the transaction.
  - After rollback, no `SMOKE_TEST_CODEX` record remained and the user's credits stayed unchanged.
  - This confirms the database RPC path can atomically create the certificate record and OTS job without leaving partial state.
- Production frontend bundle check:
  - `https://vaid.top/` static bundle includes `v-id-register`.
  - The static bundle does not include old direct `insert('v_ids')` or `quota-use` certificate-consumption code.
  - `VerifyPage` reads from `public_v_ids`.

Current interpretation:

- The most important security blockers are now fixed at the database/function boundary.
- The user's earlier successful QR scan likely used an old/duplicate certificate record, or otherwise did not create a new unique Auth-owned certificate.
- To finish the end-to-end certificate smoke test, generate one certificate with a never-before-used original file while logged in, then re-check:
  - `public.v_ids` should show one `user_id`-owned new record.
  - `user_credits.total_used` should increment from 0 to 1.
  - `free_credits` should decrement from 3 to 2.
  - `public.ots_jobs` should receive one pending/stamped job.

Still pending after these checks:

- Real unique certificate generation test by the logged-in user.
- OTS webhook/worker processing confirmation after a real job exists.
- Payment flow test.
- Activation-code flow test.
- Legacy claim flow test.
- Custom SMTP remains intentionally postponed.

## 2026-05-07 real certificate generation smoke test

User generated a new certificate after logging in with the confirmed Gmail account.

Verified production results:

- New Auth-owned certificate was created:
  - `friendly_id`: `V29Y4-42EM-9YTU`
  - `user_id` is present and matches the confirmed Gmail user.
  - `image_url` is present.
  - Initial `ots_status`: `pending`.
- Credit consumption worked correctly:
  - Before real unique certificate generation: `free_credits = 3`, `total_used = 0`.
  - After generation: `free_credits = 2`, `total_used = 1`.
  - `paid_credits` remains `0`.
- OTS queue creation worked correctly:
  - A new `public.ots_jobs` row was created for `V29Y4-42EM-9YTU`.
  - Job status is `pending`, `attempt_count = 0`.

Meaning:

- The new Auth-based certificate registration path is working end-to-end up to database persistence.
- `register_v_id` successfully performs the atomic certificate write + credit deduction + OTS job creation.
- The prior critical issues around fake success, anonymous direct insert, and client-side quota bypass are no longer visible in this production smoke test.

Current remaining issue discovered by the real smoke test:

- The OTS job stayed `pending` after waiting.
- This means automatic OTS worker dispatch is not currently connected, or the Database Webhook is not firing.
- A small migration file was prepared locally to solve this using `pg_net`:
  - `supabase/migrations/20260507143000_add_ots_job_pg_net_trigger.sql`
- Intended OTS fix design:
  - Store the OTS worker secret in Supabase Vault as `ots_worker_secret`.
  - Keep the same secret in Edge Function secret `OTS_WORKER_SECRET`.
  - Add an `AFTER INSERT` trigger on `public.ots_jobs`.
  - Trigger calls `https://vimglsksvvvnxkjnaqeh.supabase.co/functions/v1/ots-worker` asynchronously through `net.http_post`.

Temporary blocker:

- Further production Supabase CLI commands were blocked by the execution environment's approval/usage limit.
- The project itself did not fail at this step; the local agent could not continue executing production commands in this turn.
- Next continuation step: apply the prepared OTS trigger migration, set/align the Vault + Edge Function secret, then manually re-dispatch or create a retry for the pending job `V29Y4-42EM-9YTU`.

Still postponed:

- Custom SMTP / professional sender / QQ mailbox deliverability.

## 2026-05-08 OTS automatic dispatch fix

Problem found after the real certificate smoke test:

- The real Auth-owned certificate `V29Y4-42EM-9YTU` created an `ots_jobs` row, but the job stayed `pending`.
- Root cause 1: OTS automatic dispatch was not connected yet.
- Root cause 2: after manually calling `ots-worker`, the worker failed because `v-id-images` only allowed image MIME types and rejected `.ots` files uploaded as `application/octet-stream`.

Changes applied to production:

- Rotated/aligned the OTS internal worker secret:
  - Edge Function secret `OTS_WORKER_SECRET` was updated.
  - Supabase Vault secret `ots_worker_secret` was created/updated with the same value.
  - Secret value was not written to this document.
- Applied migration:
  - `20260507143000_add_ots_job_pg_net_trigger.sql`
  - Enables/uses `pg_net`.
  - Adds `public.dispatch_ots_job_to_worker()`.
  - Adds `AFTER INSERT` trigger `trg_dispatch_ots_job_to_worker` on `public.ots_jobs`.
  - Trigger calls `https://vimglsksvvvnxkjnaqeh.supabase.co/functions/v1/ots-worker` with `X-VAID-Internal-Secret` from Vault.
- Applied migration:
  - `20260508143000_allow_ots_mime_type_in_storage.sql`
  - Adds `application/octet-stream` to `storage.buckets.allowed_mime_types` for `v-id-images`.
  - This allows `.ots` proof files to be stored under the `ots/` prefix.

Verification completed:

- Manually retried `ots-worker` for `V29Y4-42EM-9YTU`.
- Worker returned success:
  - `success = true`
  - `processed = true`
  - `ots_status = stamped`
- Database state after retry:
  - `public.v_ids.ots_status = stamped`
  - `public.v_ids.ots_file_path = ots/V29Y4-42EM-9YTU.ots`
  - `public.ots_jobs.status = stamped`
  - `public.ots_jobs.processed_at` is set.
- Storage state after retry:
  - `storage.objects` contains `ots/V29Y4-42EM-9YTU.ots`.
  - MIME type: `application/octet-stream`.
  - Size: `344` bytes.
- Public verification state:
  - `public.public_v_ids` exposes `ots_status = stamped` and the OTS file path.
  - `ots-verify` Edge Function returns `success = true`, `ots_status = stamped`.
  - Production verify URL returns HTTP 200:
    - `https://vaid.top/verify/V29Y4-42EM-9YTU`

Current OTS status:

- The existing real certificate has been successfully stamped.
- Future new OTS jobs should auto-dispatch through the new `ots_jobs` trigger.
- A future full regression test should generate one more new certificate and confirm the trigger processes it without manual worker retry.

Still pending:

- Payment flow test.
- Activation-code flow test.
- Legacy claim flow test.
- Custom SMTP / professional sender / QQ mailbox deliverability remains intentionally postponed.

## 2026-05-08 legacy cleanup, payment test, activation-code test

User decision:

- Legacy certificate claiming is not needed for now.
- Reason: all previous certificates were internal tests; there are no real external users yet.
- Old `v_ids` rows with `user_id is null` can be deleted.

Legacy certificate cleanup completed:

- Backed up legacy rows before deletion:
  - `../backups/legacy-v_ids-before-delete-20260508-144630.csv`
- Backup size:
  - 149 legacy rows plus CSV header.
- Deleted production rows:
  - `public.v_ids where user_id is null`
- Verification after deletion:
  - `legacy_v_ids = 0`
  - `total_v_ids = 1`
  - Remaining certificate: `V29Y4-42EM-9YTU`
  - Remaining certificate has `user_id` and `ots_status = stamped`.

Production payment test findings:

- Browser UI test reached the real Alipay cashier successfully.
- The created order was for:
  - product: `V-ID certificate generation pack x1`
  - amount: `0.01`
  - receiver shown by Alipay: `VAID`
- This confirms the logged-in UI can create a production Alipay order and redirect to Alipay.
- I did not scan/pay the QR code, so no real money was charged.
- The unpaid test order was cleaned after verification.

Payment backend bugs found and fixed during testing:

1. `mark_alipay_order_paid_to_credits` failed with an ambiguous `user_id` reference.
   - Cause: the function returns an output column named `user_id`, and `ON CONFLICT (user_id)` became ambiguous inside PL/pgSQL.
   - Fix migration applied:
     - `20260508150500_fix_payment_credit_rpc_ambiguity.sql`
   - Fix: use `ON CONFLICT ON CONSTRAINT user_credits_pkey`.

2. `alipay_orders` still had old activation-code-era constraint `alipay_orders_paid_requires_license_key`.
   - Cause: previous architecture required a paid order to have `license_key`, but current architecture credits the authenticated account directly.
   - This would have blocked real paid order settlement.
   - Fix migration applied:
     - `20260508151500_drop_paid_order_license_key_requirement.sql`
   - Fix: drop the obsolete paid-order/license-key constraint.

Payment backend verification completed:

- Transactional production test inserted a temporary pending Alipay order, called `public.mark_alipay_order_paid_to_credits`, then rolled back.
- Expected result returned:
  - `already_processed = false`
  - `added_credits = 1`
  - `paid_credits = 1`
  - `status = paid`
- Rollback verification:
  - test orders left: `0`
  - real account credits unchanged: `free_credits = 2`, `paid_credits = 0`, `total_used = 1`
- Unauthenticated protection verified:
  - `alipay-create-order` returns `AUTH_REQUIRED`
  - `alipay-query-order` returns `AUTH_REQUIRED`

Activation-code test completed:

- Created a temporary production activation code for testing:
  - `VAID-CODE-X002`
- Browser UI accepted the code for verification.
- Product behavior note:
  - The visible `Verify Code` button checks/binds a code, but does not immediately redeem it while the account still has free quota.
  - Current account still had `free_credits = 2`, so the frontend correctly did not consume the activation code immediately.
- Backend redemption logic was tested in a production transaction and rolled back.
- Expected result returned:
  - `redeemed = true`
  - `added_credits = 1`
  - `paid_credits = 1`
  - `key_status = redeemed`
- Rollback/cleanup verification:
  - temporary activation code left: `0`
  - real account credits unchanged: `free_credits = 2`, `paid_credits = 0`, `total_used = 1`
- Unauthenticated protection verified:
  - `license-key-status` returns `AUTH_REQUIRED`
  - `license-key-use` returns `AUTH_REQUIRED`

Current status after this test pass:

- Current UI was not changed.
- Legacy anonymous certificate rows were deleted after backup.
- OTS for the remaining real certificate is stamped.
- Payment order creation UI reaches real Alipay cashier.
- Payment settlement backend now passes direct-credit testing.
- Activation-code status/redeem backend passes testing.
- Test data from this pass was cleaned.

Still postponed:

- Custom SMTP / professional sender / QQ mailbox deliverability.
- A true paid settlement test still requires an actual Alipay QR payment; today's test intentionally stopped before real payment.

## 2026-05-08 real Alipay payment smoke test

Real payment test completed:

- A real 0.01 CNY Alipay payment was made for the 1x plan.
- Paid order:
  - `out_trade_no = VID_1778227465217_jy7x36jmu`
  - `pack_size = 1`
  - `amount = 0.01`
  - `status = paid`
  - `trade_no` exists
  - `paid_at = 2026-05-08 08:05:05.123+00`
  - `license_key is null`, which is expected under the new direct-credit architecture.
- User credit result after payment:
  - `free_credits = 2`
  - `paid_credits = 1`
  - `total_used = 1`
- Browser UI also showed `Remaining uses: 3`, matching `free_credits + paid_credits`.

Conclusion:

- Real Alipay payment callback/query settlement works.
- Paid credits are added directly to the authenticated VAID account.
- No activation code is generated for normal in-site purchases.

## 2026-05-08 footer contact and share entry

User request:

- Add a contact entry at the bottom of the website.
- Users should be able to send a message without seeing the owner's email address.
- Add sharing buttons for Sina Weibo, Xiaohongshu, and WeChat Moments.
- Do not hide the activation-code input by default.

Implementation completed locally:

- Added footer contact entry in `src/App.tsx`.
- Added a contact modal form with:
  - name
  - reply email
  - message
- The owner's email address is not rendered in the frontend.
- Added footer share buttons:
  - Weibo opens the official web share URL.
  - Xiaohongshu copies `https://vaid.top/` for manual posting in the app.
  - WeChat Moments copies `https://vaid.top/` for manual posting in WeChat.
- Added i18n copy for English, Chinese, and Japanese in `src/i18n/config.ts`.

Backend added and deployed:

- Added migration:
  - `supabase/migrations/20260508165000_create_contact_messages.sql`
- Created production table:
  - `public.contact_messages`
- RLS enabled.
- `anon` and `authenticated` cannot directly read/write the table.
- Only service role can insert/read/update.
- Added and deployed Supabase Edge Function:
  - `supabase/functions/contact-submit/index.ts`
- Function validates name/email/message and inserts into `public.contact_messages`.
- Function optionally supports email forwarding through Resend if these environment variables are configured later:
  - `RESEND_API_KEY`
  - `CONTACT_TO_EMAIL`
  - `CONTACT_FROM_EMAIL`

Verification completed:

- `npm run build` passed.
- `supabase db push --dry-run` showed only `20260508165000_create_contact_messages.sql`.
- Production migration was pushed successfully.
- `contact-submit` Edge Function was deployed successfully.
- A production smoke-test message returned:
  - `success = true`
  - `delivery_status = stored`
- The smoke-test message was deleted after verification.
- Test contact message residue: `0`.

Important current limitation:

- Because email forwarding environment variables are not configured yet, contact submissions are currently stored in Supabase only.
- They do not yet forward to the owner's mailbox.
- To make it a true email workflow, configure an email provider such as Resend or SMTP-equivalent service and set the function secrets.

Deployment status:

- Backend table and Edge Function are deployed.
- Frontend code is built locally but still needs website frontend deployment before users see the new footer/contact/share UI on `vaid.top`.
