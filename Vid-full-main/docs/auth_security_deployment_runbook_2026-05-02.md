# VAID Auth/Security Deployment Runbook

Date: 2026-05-02

Status: deployment planning document. Do not treat this as approval to deploy.

## Purpose

Move VAID from the old `client_id` / frontend-write architecture to Supabase Auth + backend-controlled certificate registration.

This runbook exists because deploying the database migration, Edge Functions, and frontend in the wrong order can break certificate generation or payment.

## Current Local State

Implemented locally:

- Auth UI with email verification code login.
- Frontend blocks generation unless logged in and email-confirmed.
- Frontend certificate generation calls `v-id-register`.
- Verification page reads `public_v_ids`.
- Image upload path uses `avatars/{user_id}/{filename}` when signed in.
- Payment order creation and query require Auth.
- Payment settlement adds account credits directly.
- Activation codes redeem into account credits.
- OTS stamping reads hash from DB.
- Legacy claim endpoint computes original-file hash server-side.

Not deployed:

- Database migration.
- Edge Functions.
- Supabase Auth dashboard settings.
- OTS Database Webhook.
- OTS scheduled retry.

## Production Deployment Order

1. Back up production database.
2. Run `docs/production_precheck_auth_security_2026-05-02.sql` against production.
3. Review precheck output before continuing.
4. Configure Supabase Auth:
   - Enable email OTP login.
   - Set allowed redirect URLs for production domain and local dev.
   - Confirm the Magic Link email template shows `{{ .Token }}` as the login code and does not show `{{ .ConfirmationURL }}` as the primary login action.
5. Apply database migration:
   - `supabase/migrations/20260502093000_auth_security_refactor.sql`
6. Deploy Edge Functions:
   - `_shared` helpers are included by function deployments.
   - `v-id-register`
   - `claim-vid`
   - `ots-stamp`
   - `ots-worker`
   - `quota-check`
   - `quota-use`
   - `alipay-create-order`
   - `alipay-query-order`
   - `alipay-notify`
   - `license-key-status`
   - `license-key-use`
   - `ots-verify`
7. Deploy frontend.
8. Configure Supabase Database Webhook:
   - Source table: `public.ots_jobs`
   - Event: `INSERT`
   - Target: `ots-worker` Edge Function
   - Header: `X-VAID-Internal-Secret: <OTS_WORKER_SECRET>`
9. Configure scheduled OTS retry.
10. Run smoke tests.

## Critical Ordering Notes

- Do not deploy the new frontend before `v-id-register` exists, or generation will fail.
- Do not revoke direct `v_ids` public insert before new functions are deployed, unless generation is intentionally paused.
- Do not deploy new payment functions before `alipay_orders.user_id` and `mark_alipay_order_paid_to_credits` exist.
- Do not deploy `license-key-use` before `redeem_license_key_to_credits` exists.
- Do not deploy `claim-vid` before `claim_legacy_v_id` exists.

## Required Environment Variables

Supabase Edge Functions need:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OTS_WORKER_SECRET`

Alipay functions additionally need:

- `ALIPAY_APP_ID`
- `ALIPAY_PRIVATE_KEY`
- `ALIPAY_PUBLIC_KEY`
- `ALIPAY_SELLER_ID` or `ALIPAY_SELLER_EMAIL`
- `SITE_URL` or `PUBLIC_SITE_URL`
- Optional: `ALIPAY_RETURN_URL_ALLOWLIST`

Frontend needs:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Smoke Tests After Deployment

Auth:

- Open homepage signed out.
- Confirm top-right login button appears beside language switcher.
- Send a verification code to a test email.
- Complete login by entering the code on the VAID login form.
- Confirm account button shows signed-in state.

Credits:

- New confirmed test user sees 3 available credits.
- Unconfirmed user cannot generate.

Certificate:

- Upload a small test image.
- Generate certificate.
- Confirm `v-id-register` returns a backend-created `friendly_id`.
- Confirm `v_ids.user_id` equals the Auth user id.
- Confirm credit count decrements exactly once.
- Confirm direct anonymous insert into `v_ids` fails.
- Confirm `/verify/{friendly_id}` loads through `public_v_ids`.

OTS:

- Confirm `register_v_id` inserts an `ots_jobs` row.
- Confirm webhook calls `ots-worker`.
- Confirm direct calls to `ots-worker` or `ots-stamp` without `X-VAID-Internal-Secret` return forbidden.
- Confirm `ots_status` changes from `pending` to `stamped` or `failed`.
- Confirm `ots_file_path` is written only by backend functions.

Payment:

- Create an Alipay test order while logged in.
- Confirm `alipay_orders.user_id` is current user id.
- Query order as same user succeeds.
- Query order as a different user fails with forbidden.
- Paid order adds `paid_credits` directly.
- Payment success page does not expose `license_key`.

Activation code:

- Existing active code can be redeemed by logged-in verified user.
- Redeemed code increases `paid_credits`.
- Same code cannot be redeemed again.

Legacy claim:

- Legacy record with `user_id IS NULL` and matching original-file hash can be claimed.
- Wrong file hash fails.
- Already-owned record cannot be claimed again.
- Audit rows are written for both failed and successful attempts.

## Rollback Strategy

Fast rollback if frontend breaks:

- Redeploy previous frontend build.
- Keep database migration in place if possible; old public direct insert may still be blocked, so old generation can remain broken unless the old RLS policy is restored.

Database rollback is more sensitive:

- Do not drop new tables immediately; they may contain new credits/orders/claims.
- To temporarily restore old frontend behavior, re-add the old `v_ids` INSERT policy only if the user explicitly accepts the security risk.
- Prefer fixing the new function/frontend issue rather than reopening anonymous insert.

Emergency temporary policy rollback:

```sql
CREATE POLICY "Temporary anonymous v_ids insert rollback"
  ON public.v_ids
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    character_name IS NOT NULL
    AND creator_name IS NOT NULL
    AND sha256_hash IS NOT NULL
    AND length(sha256_hash) = 64
  );
```

Risk of this rollback:

- It reopens the original quota/payment bypass vulnerability.
- Use only as a short emergency bridge, with a clear time limit.

## UI Protection Rule

The current VAID UI is user-approved and manually tuned.

Any further visual changes must be warned and approved before editing:

- Hero title layout
- Hero character position
- Chinese/Japanese line breaks or font sizes
- Mobile/desktop UI layout
- Language switcher styling
- Login button/modal styling beyond minimal Auth operation

Backend/security changes should preserve UI unless explicitly approved.
