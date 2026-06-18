# VAID Monitoring and Recovery Runbook

Date: 2026-06-18

Status verified 2026-06-18: workflow definitions are implemented on
`codex/strong-proof-ui-entry`, but GitHub's default branch is `main` and `main`
contains no workflow files. GitHub reports no monitor or backup workflow run
history. Scheduled monitoring and database backup are therefore **not active**.
Do not claim this operations layer is complete until the activation and restore
steps below are verified.

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
- Manual `workflow_dispatch` is intended after the workflow is installed on the
  default branch; it is not currently discoverable through GitHub's workflow
  API.
- GitHub scheduled workflows run from the repository default branch, so this
  workflow must also exist on that branch for automatic scheduling to work.

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

Workflow:

`/.github/workflows/database-backup.yml`

Intended schedule after activation:

- Daily at 19:30 UTC, which is 03:30 Beijing time.
- Manual `workflow_dispatch` is intended after the workflow is installed on the
  default branch; it is not currently discoverable through GitHub's workflow
  API.
- GitHub scheduled workflows run from the repository default branch, so this
  workflow must also exist on that branch for automatic scheduling to work.

Required GitHub Secrets:

- `SUPABASE_DB_URL`: the percent-encoded Supabase Postgres connection string.
- `BACKUP_ENCRYPTION_PASSPHRASE`: a strong backup encryption passphrase stored
  outside the repository and password manager backed up separately.

Backup behavior:

1. Creates a schema dump with `supabase db dump`.
2. Creates a data-only dump with `supabase db dump --data-only --use-copy`.
3. Verifies both dump files are non-empty.
4. Packages them into a tar archive.
5. Encrypts the archive using GPG AES-256 symmetric encryption.
6. Deletes the plaintext archive and dump directory.
7. Uploads only the encrypted `.gpg` artifact to GitHub Actions.
8. Keeps the encrypted artifact for 14 days.

If either secret is missing, the workflow fails loudly. That is intentional:
backup cannot be considered configured until the secrets exist.

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

1. Download the encrypted backup artifact from a successful
   `Backup VAID Database` run.
2. Decrypt it outside the repository:

```bash
gpg --batch --yes --pinentry-mode loopback \
  --passphrase "$BACKUP_ENCRYPTION_PASSPHRASE" \
  -o /private/tmp/vaid-db-backup.tar.gz \
  --decrypt /path/to/vaid-db-backup.tar.gz.gpg
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

## RPO and RTO

Initial targets:

- RPO: 24 hours for Postgres data while the daily backup workflow is healthy.
- RTO: 4 hours for static frontend rollback; 1 business day for full database
  restore until a staging restore drill has been completed.

These targets are conservative and should be tightened only after a successful
non-production database restore drill.

## Known Limitations

- GitHub Actions failure notification depends on GitHub notification settings.
  For SMS/Slack/phone alerts, add a dedicated incident tool later.
- The backup workflow cannot run successfully until the required GitHub Secrets
  are configured.
- GitHub artifact retention is not a complete long-term backup policy. For
  long-term retention, mirror the encrypted archive to dedicated offsite
  storage.
- Supabase Storage/R2 object backup is not yet automated by this workflow.
  Current database backup covers Postgres schema/data only.

## Operational Owner Notes

- Do not commit decrypted backups.
- Do not store plaintext database dumps in the repository.
- Do not restore into production for a drill.
- Treat backup encryption passphrases as production secrets.
- Update `AGENTS.md` and the AI release handoff runbook if the monitoring or
  backup workflow changes.
