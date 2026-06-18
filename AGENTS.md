# VAID Agent Instructions

These instructions are mandatory for any AI agent taking over this repository.
Read this file before editing, testing, committing, pushing, deploying, or
touching production.

## Project Map

- Repository root: `/Users/yan/Documents/VAID`
- App root: `/Users/yan/Documents/VAID/Vid-full-main`
- Production site: `https://vaid.top`
- Deployment workflow: `.github/workflows/deploy.yml`
- Production branch: `codex/strong-proof-ui-entry`
- Production server target: `/srv/www/vaid.top/current`
- Release directory pattern: `/srv/www/vaid.top/releases/<GITHUB_SHA>`
- Deploy account: `vaid-deploy`

Do not assume the app lives at the repository root. Build and app checks run
from `Vid-full-main`.

## Operating Rules

1. State assumptions before implementation.
2. If there are multiple plausible interpretations, surface them.
3. Make the smallest change that solves the requested problem.
4. Do not refactor adjacent code unless the request explicitly requires it.
5. Do not remove or revert unrelated user changes.
6. Define success criteria and verify them with commands.
7. Stop and ask if a missing detail would make the change risky or destructive.
8. Never expose secrets, private keys, service-role keys, payment keys, or
   personal identity data.

Every changed line should trace back to the user's request.

## Product Development Gate

Do not start by building features. First confirm the product stage and evidence.

For product work, follow this sequence:

1. Idea: validate the problem, user, frequency, pain, current workaround,
   competitors, and whether the proposed solution addresses the real problem.
2. MVP: define what is in scope and out of scope before coding. Keep the
   architecture and decision records updated.
3. Launch: fix technical debt, add tests, strengthen security, add feedback
   and operations processes, and track real retention/revenue/referral signals.
4. Scale: document founder knowledge, standardize operations, add monitoring,
   support, compliance, and repeatable go-to-market systems.

Core rule: prove the problem before building, define scope before coding, and
look at real data before scaling.

## Required Reading Before Production-Impacting Work

Read these files before changing deployment, auth, payments, registration,
verification, storage, database migrations, or card rendering:

- `AGENTS.md`
- `Vid-full-main/docs/AI_DEVELOPMENT_CONTEXT.md`
- `Vid-full-main/docs/VAID_AI_RELEASE_AND_HANDOFF_RUNBOOK_2026-06-18.md`
- `Vid-full-main/docs/VAID_POST_LAUNCH_HEALTH_AUDIT_2026-06-18.md`
- `Vid-full-main/docs/VAID_SERVER_HARDENING_2026-06-18.md`

## Production Release Contract

The only normal production release path is:

1. Work on `codex/strong-proof-ui-entry`.
2. Commit only intentional files.
3. Push to `origin/codex/strong-proof-ui-entry`.
4. Let GitHub Actions run `.github/workflows/deploy.yml`.
5. Deploy only after all workflow gates pass.

The workflow must run these gates before upload/deploy:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Do not manually upload `dist` to production for normal releases. Do not deploy
from an uncommitted dirty working tree. Do not bypass CI unless the user
explicitly declares an emergency production incident and accepts the risk.

## Local Verification Before Push

From `Vid-full-main`, run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected current lint state: zero errors, with the known React Fast Refresh
warnings in `src/main.tsx`.

The minimum production gate must keep covering:

- registration credit consumption
- payment creation and Alipay settlement
- RLS and private table boundaries
- identity document privacy
- public verification fields
- standard card generation and preview serving

## After Push

After pushing to `codex/strong-proof-ui-entry`, verify:

1. GitHub Actions run `Deploy VAID` completed with `conclusion: success`.
2. Server `current` points to `/srv/www/vaid.top/releases/<pushed_sha>`.
3. `https://vaid.top/` returns HTTP 200.
4. `https://vaid.top/internal/card-renderer/health` returns HTTP 200.
5. Nginx, `vaid-card-renderer`, and `certbot-renew.timer` are active.
6. `rpcbind.service` and `rpcbind.socket` remain inactive.
7. No warning-level Nginx or renderer logs appeared after deployment.

## Rollback Rule

Rollback is done by switching the `current` symlink to a known-good release,
then validating Nginx and reloading it:

```bash
TARGET=/srv/www/vaid.top/releases/<known_good_sha>
CURRENT=/srv/www/vaid.top/current
test -d "$TARGET"
ln -sfn "$TARGET" "$CURRENT"
sudo /usr/sbin/nginx -t
sudo /usr/bin/systemctl reload nginx
```

Then rerun the post-push health checks above. The baseline tag
`production-2026-06-18` exists, but always verify the exact release SHA before
using it.

## Files and Directories Not To Publish

Do not stage or commit:

- `.deploy_keys/`
- `.env.local`
- `Vid-full-main/node_modules/`
- `Vid-full-main/dist/`
- `Vid-full-main/supabase/.temp/`
- `outputs/`
- `backups/`
- `.DS_Store`

`outputs/` and `backups/` are local generated/archive directories, not app
source code.

## Security Non-Negotiables

- Creator identity document numbers must never be stored in browser
  `localStorage` or `sessionStorage`.
- Public verification must read from `public_v_ids`, not direct private tables.
- Privileged writes must go through Edge Functions and service-role RPCs.
- Payment settlement must verify signature, app ID, seller identity, amount,
  ownership, and idempotency.
- Registration must atomically consume one credit, create one record, and
  insert the related backend job.
- Private evidence material must not be exposed on public verification pages.

## When In Doubt

Prefer a narrow, verifiable change. If the request might affect production,
database state, payment, identity privacy, or release safety, pause and state
the risk before proceeding.
