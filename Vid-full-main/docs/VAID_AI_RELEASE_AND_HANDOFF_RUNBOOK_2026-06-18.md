# VAID AI Release and Handoff Runbook

Date: 2026-06-18

## Purpose

This document lets a future AI agent take over VAID without guessing the
release process. It records the current production branch, CI gate, deployment
path, verification checks, and rollback procedure.

## Current Production Process

- Repository: `git@github.com:dubhsgs/Vid-full.git`
- Repository root: `/Users/yan/Documents/VAID`
- App root: `/Users/yan/Documents/VAID/Vid-full-main`
- Production branch: `codex/strong-proof-ui-entry`
- Workflow: `.github/workflows/deploy.yml`
- Workflow name: `Deploy VAID`
- Trigger: push to `codex/strong-proof-ui-entry` or manual
  `workflow_dispatch`
- Server release root: `/srv/www/vaid.top/releases`
- Active release symlink: `/srv/www/vaid.top/current`
- Deploy user: `vaid-deploy`

The workflow builds from `Vid-full-main` and deploys the generated `dist`
directory to `/srv/www/vaid.top/releases/<GITHUB_SHA>`, then atomically points
`/srv/www/vaid.top/current` at that release.

## CI Gate

Before production upload and activation, GitHub Actions must run:

1. `npm ci`
2. `npm test`
3. `npm run typecheck`
4. `npm run lint`
5. `npm run build`

Deployment must not happen if any of these fail.

The current minimum test gate is `Vid-full-main/tests/production-gate.test.mjs`.
It protects these production contracts:

- registration consumes credits only through the atomic `v-id-register` flow
- Alipay order creation and settlement require auth, verification, amount
  checks, and idempotency
- RLS keeps private tables owner-only
- identity document numbers are encrypted server-side and not persisted in
  browser storage
- public verification uses `public_v_ids` and does not expose private fields
- standard card generation uses the controlled renderer and serves only ready
  card previews

## Local Pre-Push Checklist

Run from `Vid-full-main`:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected lint state as of this runbook: zero errors and eight existing React
Fast Refresh warnings in `src/main.tsx`.

Do not push if any command exits non-zero.

## Standard Release Steps

1. Confirm scope.
   - Run `git status --short --branch`.
   - Identify unrelated dirty files.
   - Do not stage `outputs/`, `backups/`, `.deploy_keys/`, env files, `dist/`,
     `node_modules/`, `.DS_Store`, or Supabase temp files.

2. Make the smallest change.
   - Do not refactor unrelated files.
   - Add or update tests for production-risk changes.
   - For database changes, add a new migration. Do not rewrite applied
     migrations.

3. Run local checks.
   - `npm test`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`

4. Commit intentionally.
   - Stage explicit files only.
   - Use a concise commit message.

5. Push to production branch only when the user has approved release.
   - Branch: `codex/strong-proof-ui-entry`
   - Do not manually SCP `dist` for normal releases.

6. Watch GitHub Actions.
   - The run must finish with `conclusion: success`.
   - The run must be for the pushed commit SHA.

7. Verify production after the workflow completes.
   - Active release should point to `/srv/www/vaid.top/releases/<pushed_sha>`.
   - `https://vaid.top/` should return HTTP 200.
   - `https://vaid.top/internal/card-renderer/health` should return HTTP 200.
   - `nginx`, `vaid-card-renderer`, and `certbot-renew.timer` should be active.
   - `rpcbind.service` and `rpcbind.socket` should remain inactive.
   - Nginx and renderer warning logs should be empty for the post-deploy window.

## Useful Verification Commands

Production release pointer:

```bash
ssh -i /Users/yan/Documents/VAID/.deploy_keys/vaid_actions_deploy_ed25519 \
  -o IdentitiesOnly=yes -o BatchMode=yes \
  vaid-deploy@47.93.232.20 \
  'readlink -f /srv/www/vaid.top/current'
```

Service state:

```bash
ssh -i /Users/yan/Documents/VAID/.deploy_keys/vaid_actions_deploy_ed25519 \
  -o IdentitiesOnly=yes -o BatchMode=yes \
  vaid-deploy@47.93.232.20 \
  'systemctl is-active nginx vaid-card-renderer certbot-renew.timer rpcbind.service rpcbind.socket'
```

Site smoke checks:

```bash
curl -sS -o /tmp/vaid-home.html -w 'home=%{http_code} ttfb=%{time_starttransfer}\n' https://vaid.top/
curl -sS -o /tmp/vaid-renderer-health.txt -w 'renderer=%{http_code} ttfb=%{time_starttransfer}\n' https://vaid.top/internal/card-renderer/health
```

Recent warning logs:

```bash
ssh -i /Users/yan/Documents/VAID/.deploy_keys/vaid_actions_deploy_ed25519 \
  -o IdentitiesOnly=yes -o BatchMode=yes \
  vaid-deploy@47.93.232.20 \
  'journalctl -u nginx -u vaid-card-renderer --since=-5min -p warning --no-pager -q'
```

GitHub Actions status can be checked with the GitHub API when `gh` is not
installed:

```bash
curl -sS 'https://api.github.com/repos/dubhsgs/Vid-full/actions/runs?branch=codex/strong-proof-ui-entry&event=push&per_page=5'
```

## Rollback Drill Procedure

Use rollback only when a known-good release exists on the server.

1. Pick a known-good SHA.
   - Prefer the last successful release shown by `readlink -f`.
   - The tag `production-2026-06-18` exists as a baseline, but verify its SHA
     and contents before use.

2. Switch the symlink and reload:

```bash
TARGET=/srv/www/vaid.top/releases/<known_good_sha>
CURRENT=/srv/www/vaid.top/current
test -d "$TARGET"
ln -sfn "$TARGET" "$CURRENT"
sudo /usr/sbin/nginx -t
sudo /usr/bin/systemctl reload nginx
```

3. Repeat the production verification checks.

## Manual Deployment Policy

Manual deployment is not the normal path. Use it only for a declared emergency,
after stating the risk and getting explicit user approval.

Normal releases must go through GitHub Actions so the test, typecheck, lint,
and build gates cannot be skipped.

## Handoff Notes For Future AI Agents

- Start by reading `AGENTS.md` at the repository root.
- Treat `Vid-full-main/docs/AI_DEVELOPMENT_CONTEXT.md` as the architecture and
  security contract.
- Treat this runbook as the release contract.
- Keep documentation updated when the branch, workflow, deploy user, release
  directory, or verification gate changes.
- If a future instruction conflicts with this runbook, state the conflict
  clearly before acting.
