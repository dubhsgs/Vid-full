# VAID Development Record - Monitoring and Local Encrypted Backup

Date: 2026-06-19
Commit: pending

## Goal

Make VAID production monitoring and database backup operational without
exporting production database dumps to GitHub artifact storage.

## Files Changed

- `.github/workflows/database-backup.yml`
- `AGENTS.md`
- `Vid-full-main/ops/db-backup/local-encrypted-db-backup.sh`
- `Vid-full-main/ops/db-backup/com.vaid.db-backup.plist`
- `Vid-full-main/docs/VAID_MASTER_HANDOFF.md`
- `Vid-full-main/docs/VAID_MONITORING_AND_RECOVERY_RUNBOOK_2026-06-18.md`
- `Vid-full-main/docs/VAID_AI_RELEASE_AND_HANDOFF_RUNBOOK_2026-06-18.md`
- `Vid-full-main/docs/VAID_DEVELOPMENT_RECORD_MONITORING_AND_LOCAL_BACKUP_2026-06-19.md`

## Database or Environment Changes

- GitHub default branch changed from `main` to `codex/strong-proof-ui-entry`.
- GitHub Actions now registers `Monitor VAID Production`.
- GitHub `Backup VAID Database` workflow was disabled remotely.
- GitHub backup secrets `SUPABASE_DB_URL` and
  `BACKUP_ENCRYPTION_PASSPHRASE` were removed; `VAID_DEPLOY_SSH_KEY` remains.
- macOS Keychain items used by local backup:
  - `VAID_SUPABASE_DB_URL`
  - `VAID_BACKUP_ENCRYPTION_PASSPHRASE`
- macOS LaunchAgent installed:
  `/Users/yan/Library/LaunchAgents/com.vaid.db-backup.plist`.
- LaunchAgent runtime script installed:
  `/Users/yan/Library/Application Support/VAID/db-backup/local-encrypted-db-backup.sh`.
- Encrypted backups are retained under:
  `/Users/yan/Library/Application Support/VAID/backups`.

## Security Impact

- Production monitor runs in GitHub Actions and uses the existing deploy SSH
  key for server checks.
- GitHub artifact database backups are disabled to avoid exporting production
  dumps to GitHub-hosted artifact storage.
- Database backups are generated locally, encrypted with GPG AES-256 before
  retention, and plaintext dump directories/archives are deleted after
  encryption.
- Current backup retention depends on the owner's Mac, login Keychain, and
  local disk. Independent offsite/server-side retention is still required.

## Verification Performed

- `gh repo view dubhsgs/Vid-full --json defaultBranchRef,nameWithOwner,viewerPermission`
  confirmed default branch `codex/strong-proof-ui-entry` and `ADMIN`
  permission.
- `gh workflow list -R dubhsgs/Vid-full` confirmed:
  - `Deploy VAID` active
  - `Monitor VAID Production` active
- `gh workflow run production-monitor.yml -R dubhsgs/Vid-full --ref codex/strong-proof-ui-entry`
  triggered monitor run `27773268623`.
- `gh run watch 27773268623 -R dubhsgs/Vid-full --exit-status` completed
  successfully.
- Supabase pooler and direct Postgres connections both passed `select 1`.
- `Vid-full-main/ops/db-backup/local-encrypted-db-backup.sh` generated:
  `/Users/yan/Documents/VAID/backups/vaid-db-backup-20260618T164916Z.tar.gz.gpg`.
- LaunchAgent `com.vaid.db-backup` was installed and kickstarted; it exited
  with code `0` and generated:
  `/Users/yan/Library/Application Support/VAID/backups/vaid-db-backup-20260618T165441Z.tar.gz.gpg`.
- The launchd-generated encrypted backup was decrypted and restored into a
  disposable local Postgres database `vaid_restore_20260618T165441Z`.
- Restore verification:
  - `public.v_ids` count: 8
  - `public.public_v_ids` count: 8
  - `public.alipay_orders` exists: true
  - `public.user_credits` exists: true
  - `public.v_id_creator_identity_claims` exists: true
  - `public.v_id_creator_identity_claims` RLS enabled: true
  - sample public verification record: `VTK-AVA-KRG`
  - anonymous read of identity claims: blocked
  - anonymous read of `public.public_v_ids`: ok, count 8
- Local restore produced expected Supabase-platform errors for unavailable
  managed extensions/objects in plain local Postgres; the VAID critical public
  checks passed.

## Deployment Status

- GitHub default branch and workflow registration changes are active remotely.
- Production monitor is active and verified by run `27773268623`.
- Local encrypted backup LaunchAgent is installed and verified by kickstart.
- Source file changes still need the standard local gate, commit, and push.

## Rollback Notes

- To disable the local backup LaunchAgent:

```bash
launchctl bootout gui/$(id -u) /Users/yan/Library/LaunchAgents/com.vaid.db-backup.plist
```

- Do not re-enable GitHub artifact database backup without a new explicit
  security/storage decision.
