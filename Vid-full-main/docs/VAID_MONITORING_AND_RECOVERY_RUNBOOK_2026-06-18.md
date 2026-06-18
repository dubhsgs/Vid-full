# VAID Monitoring and Recovery Runbook

Date: 2026-06-18

Status verified 2026-06-19:

- GitHub default branch is `codex/strong-proof-ui-entry`.
- `Monitor VAID Production` is registered and active in GitHub Actions.
- Manual monitor run `27773268623` completed successfully.
- GitHub artifact database backup is disabled. Do not export production
  database dumps to GitHub Actions artifact storage.
- Active Postgres backup automation is local macOS LaunchAgent
  `com.vaid.db-backup`.
- LaunchAgent kickstart completed with exit code `0` and generated encrypted
  artifact
  `/Users/yan/Library/Application Support/VAID/backups/vaid-db-backup-20260618T165441Z.tar.gz.gpg`.
- The launchd-generated artifact was decrypted and restored into a disposable
  local Postgres database; critical public table/view and RLS checks passed.

## Purpose

This runbook documents the first production monitoring and recovery layer for
VAID. It covers website/API/renderer alerts, server resource monitoring,
database backup automation, and the safe boundary for restore drills.

## Monitoring Workflows

### 1. Production monitor

Workflow:

`/.github/workflows/production-monitor.yml`

Intended schedule after activation:

- Every 15 minutes.
- Manual `workflow_dispatch` is available.
- GitHub scheduled workflows run from the repository default branch; the
  default branch is now `codex/strong-proof-ui-entry`.

Checks:

- `https://vaid.top/` returns HTTP 200.
- `https://vaid.top/verify/VTK-AVA-KRG` returns HTTP 200.
- `https://vaid.top/internal/card-renderer/health` returns HTTP 200 and
  contains `"ok": true`.
- Supabase REST `public_v_ids` query returns HTTP 200 with the public anon key.
- Server `current` symlink points under `/srv/www/vaid.top/releases/`.
- `nginx` is active.
- `vaid-card-renderer` is active.
- `certbot-renew.timer` is active.
- `rpcbind.service` and `rpcbind.socket` remain inactive.
- Root disk usage is below 80%.
- Available memory is at least 150 MB.
- Nginx and renderer have no warning-level logs in the previous 15 minutes.

Alert behavior:

- A failed check fails the GitHub Actions workflow.
- GitHub sends standard workflow failure notifications according to the repo
  owner's GitHub notification settings.

### 2. Database backup

Disabled GitHub workflow:

`/.github/workflows/database-backup.yml`

This workflow is intentionally disabled as a backup path. It no longer has a
schedule, and manual dispatch exits with an error explaining that GitHub
artifact database backup is disabled. Do not re-enable it for production
database dumps.

Active local automation:

- LaunchAgent label: `com.vaid.db-backup`.
- Installed plist: `/Users/yan/Library/LaunchAgents/com.vaid.db-backup.plist`.
- Source plist:
  `/Users/yan/Documents/VAID/Vid-full-main/ops/db-backup/com.vaid.db-backup.plist`.
- Installed script:
  `/Users/yan/Library/Application Support/VAID/db-backup/local-encrypted-db-backup.sh`.
- Source script:
  `/Users/yan/Documents/VAID/Vid-full-main/ops/db-backup/local-encrypted-db-backup.sh`.
- Backup directory:
  `/Users/yan/Library/Application Support/VAID/backups`.
- Logs:
  `/Users/yan/Library/Logs/VAID/db-backup.log` and
  `/Users/yan/Library/Logs/VAID/db-backup.err`.

Schedule:

- Daily at 03:30 local machine time, currently Asia/Shanghai time.

Required macOS Keychain items:

- Service `VAID_SUPABASE_DB_URL`, account `VAID`: the percent-encoded Supabase
  Postgres connection string.
- Service `VAID_BACKUP_ENCRYPTION_PASSPHRASE`, account `VAID`: the GPG
  symmetric encryption passphrase.

Backup behavior:

1. Creates a schema dump with `pg_dump --schema-only --no-owner`.
2. Creates a data-only dump with `pg_dump --data-only --no-owner`.
3. Verifies both dump files are non-empty.
4. Packages them into a tar archive.
5. Encrypts the archive using GPG AES-256 symmetric encryption.
6. Deletes the plaintext archive and dump directory.
7. Stores only the encrypted `.gpg` artifact in the local backup directory.
8. Deletes local encrypted artifacts older than 14 days.

If either Keychain item is missing or the database password is invalid, the
LaunchAgent exits non-zero and writes to the local error log.

Useful status commands:

```bash
launchctl print gui/$(id -u)/com.vaid.db-backup
tail -n 20 /Users/yan/Library/Logs/VAID/db-backup.log
tail -n 20 /Users/yan/Library/Logs/VAID/db-backup.err
ls -lh /Users/yan/Library/Application\ Support/VAID/backups/
```

## Current Recovery Targets

### Static site rollback

Current rollback model:

- The deployed frontend is stored as immutable release directories under
  `/srv/www/vaid.top/releases/<GITHUB_SHA>`.
- Rollback is a symlink switch plus `nginx -t` and Nginx reload.

Command pattern:

```bash
TARGET=/srv/www/vaid.top/releases/<known_good_sha>
CURRENT=/srv/www/vaid.top/current
test -d "$TARGET"
ln -sfn "$TARGET" "$CURRENT"
sudo /usr/sbin/nginx -t
sudo /usr/bin/systemctl reload nginx
```

Post-rollback checks:

```bash
curl -sS -o /tmp/vaid-home.html -w 'home=%{http_code}\n' https://vaid.top/
curl -sS -o /tmp/vaid-renderer-health.txt -w 'renderer=%{http_code}\n' https://vaid.top/internal/card-renderer/health
```

### Database restore drill

Do not restore into production during a drill.

Minimum safe drill target:

- A separate Supabase staging project, or
- A disposable local Supabase/Postgres environment that can accept the dump.

Restore drill procedure:

1. Pick an encrypted backup artifact from
   `/Users/yan/Library/Application Support/VAID/backups`.
2. Decrypt it outside the repository:

```bash
security find-generic-password -a VAID \
  -s VAID_BACKUP_ENCRYPTION_PASSPHRASE -w > /private/tmp/vaid-backup-passphrase
gpg --batch --yes --pinentry-mode loopback \
  --passphrase-file /private/tmp/vaid-backup-passphrase \
  -o /private/tmp/vaid-db-backup.tar.gz \
  --decrypt /path/to/vaid-db-backup.tar.gz.gpg
rm -f /private/tmp/vaid-backup-passphrase
```

3. Extract into a temporary directory:

```bash
mkdir -p /private/tmp/vaid-db-restore-drill
tar -xzf /private/tmp/vaid-db-backup.tar.gz -C /private/tmp/vaid-db-restore-drill
```

4. Restore into the non-production target only.

5. Verify at minimum:

- `public.v_ids` row count is present.
- `public.public_v_ids` is queryable.
- `public.alipay_orders` exists.
- `public.user_credits` exists.
- `public.v_id_creator_identity_claims` exists.
- RLS-sensitive tables are not publicly readable.
- A sample public verification record can be queried through `public_v_ids`.

6. Record the drill result in `docs/` with:

- backup artifact name
- restore target
- restore start/end time
- commands used
- verification SQL
- failures and fixes

Latest verified drill evidence, 2026-06-19 Asia/Shanghai:

- artifact:
  `/Users/yan/Library/Application Support/VAID/backups/vaid-db-backup-20260618T165441Z.tar.gz.gpg`
- restore target: disposable local Postgres database
  `vaid_restore_20260618T165441Z`
- restore was not performed against production
- verification:
  - `public.v_ids` count: 8
  - `public.public_v_ids` count: 8
  - `public.alipay_orders` exists: true
  - `public.user_credits` exists: true
  - `public.v_id_creator_identity_claims` exists: true
  - `public.v_id_creator_identity_claims` RLS enabled: true
  - sample public verification record: `VTK-AVA-KRG`
  - anonymous read of identity claims: blocked
  - anonymous read of `public.public_v_ids`: ok, count 8
- local restore produced expected Supabase-platform errors for unavailable
  managed extensions/objects in plain local Postgres; the VAID critical public
  tables, view, row counts, and RLS checks passed.

## RPO and RTO

Initial targets:

- RPO: 24 hours for Postgres data while the daily local LaunchAgent backup is
  healthy and the owner's Mac is awake/logged in at the scheduled time.
- RTO: 4 hours for static frontend rollback; 1 business day for full database
  restore until an offsite or staging restore drill has been completed.

These targets are conservative and should be tightened only after offsite
backup retention and a staging restore drill are completed.

## Known Limitations

- GitHub Actions failure notification depends on GitHub notification settings.
  For SMS/Slack/phone alerts, add a dedicated incident tool later.
- Database backup currently depends on the owner's Mac, login Keychain, and
  local disk. Add independent server-side or offsite retention next.
- GitHub artifact backup is intentionally disabled and should not be treated as
  a fallback.
- Supabase Storage/R2 object backup is not yet automated by this local backup.
  Current database backup covers Postgres schema/data only.

## Operational Owner Notes

- Do not commit decrypted backups.
- Do not store plaintext database dumps in the repository.
- Do not restore into production for a drill.
- Treat backup encryption passphrases as production secrets.
- Do not re-enable GitHub artifact database backup without a new security
  review and explicit storage decision.
- Update `AGENTS.md` and the AI release handoff runbook if the monitoring or
  backup workflow changes.
