# VAID Development Record - Security Architecture Round 2

Date: 2026-06-04
Commit: pending

## Goal

Reduce privacy and legal-risk exposure after the first security baseline passed testing.

## Files Changed

- `supabase/functions/v-id-register/index.ts`
- `supabase/functions/original-cleanup/index.ts`
- `supabase/migrations/20260604090000_original_upload_cleanup.sql`
- `src/pages/VerifyPage.tsx`
- `src/pages/DocsPage.tsx`
- `src/i18n/config.ts`
- `docs/AI_DEVELOPMENT_CONTEXT.md`

## Database or Environment Changes

- Add `dispatch_original_upload_cleanup` RPC.
- Add `vaid-original-upload-cleanup` cron job, scheduled every 6 hours.
- Reuse the existing internal worker secret for the cleanup Edge Function.

## Security Impact

- `v-id-register` now attempts to delete the original upload after every owned registration attempt, including validation failures and RPC errors.
- Abandoned original uploads are cleaned by a scheduled internal worker.
- Public copy is tightened to avoid claims of ownership determination, legal title, notarization, or guaranteed legal effect.

## Verification Performed

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`
- Supabase migration dry-run showed only `20260604090000_original_upload_cleanup.sql`.
- Confirmed `vaid-original-upload-cleanup` cron job is active.
- Confirmed unauthenticated `original-cleanup` calls return `403`.
- Confirmed `dispatch_original_upload_cleanup(24, 100)` dispatches successfully.

## Deployment Status

- Database migration applied to Supabase production.
- `v-id-register` and `original-cleanup` deployed to Supabase production.
- Frontend deployment pending commit and release activation.

## Rollback Notes

- Revert the Git commit for frontend and function source.
- Unschedule `vaid-original-upload-cleanup` if the cleanup function must be disabled.
