# VAID Development Record - Security Baseline

Date: 2026-06-03
Commit: pending

## Goal

Fix the first security baseline issues before continued launch promotion.

## Files Changed

- `ops/nginx/vaid.top.conf`
- `src/components/CardGenerator.tsx`
- `src/i18n/config.ts`
- `src/pages/VerifyPage.tsx`
- `supabase/functions/alipay-notify/index.ts`
- `supabase/functions/ots-download/index.ts`
- `supabase/functions/ots-stamp/index.ts`
- `supabase/functions/ots-verify/index.ts`
- `supabase/functions/ots-worker/index.ts`
- `supabase/migrations/20260603090000_public_verification_and_ots_security_baseline.sql`

## Database or Environment Changes

- Applied `20260530060000_shorten_friendly_id_format.sql`.
- Applied `20260603090000_public_verification_and_ots_security_baseline.sql`.
- Created private `v-id-ots` storage bucket.
- Restricted public `v-id-images` read policies to avatar paths.
- Added `vaid-ots-maintenance` cron job to dispatch OTS retries and confirmations.

## Security Impact

- Public verification no longer exposes `sha256_hash` or `ots_file_path`.
- OTS proof downloads now require authenticated ownership through `ots-download`.
- Future OTS proof files are stored in the private `v-id-ots` bucket.
- Alipay notify logging no longer prints the raw callback payload.
- Production responses now include HSTS, CSP, frame, referrer, and content-type headers.

## Verification Performed

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`
- Confirmed `public.public_v_ids` exposes only public fields.
- Confirmed `v-id-ots` is private and public storage policies are avatar-only.
- Confirmed `vaid-ots-maintenance` cron job is active.
- Confirmed `ots-verify` rejects unauthenticated requests and accepts frontend credentials.
- Confirmed `ots-download` rejects requests without an authenticated user.
- Manually dispatched OTS maintenance and observed a pending test record become `stamped`.
- Confirmed live `https://vaid.top/` returns the expected security headers.

## Deployment Status

- Database migrations applied to Supabase production.
- Edge Functions deployed to Supabase production.
- Nginx configuration updated and reloaded on the production server.
- Frontend deployment is handled by GitHub Actions after commit push.

## Rollback Notes

- Revert the Git commit for frontend and function source.
- Restore the previous Nginx config from `/etc/nginx/conf.d/vaid.top.http.conf.disabled-202606032340` if needed.
- Database rollback would require a forward migration to restore the previous public view and storage policies.
