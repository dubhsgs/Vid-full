# VAID Post-Launch Health Audit

Status: historical audit snapshot. Several findings were remediated after this
audit, including the CI gate and frontend module split. Monitoring and backup
workflow files were added but are not scheduled because they are absent from
GitHub's default branch. Use `VAID_MASTER_HANDOFF.md` for current status.

Date: 2026-06-18

Scope:

- Production site: `https://vaid.top`
- Frontend: `Vid-full-main/src`
- Backend: `Vid-full-main/supabase/functions`
- Database change history: `Vid-full-main/supabase/migrations`
- Aliyun Nginx and card-renderer host
- Git and deployment workflow

This was a read-only audit. No business code, production configuration, or
production data was changed.

## 1. Executive Conclusion

VAID is currently operational, but it is not yet a permanently maintainable
project.

No software project can be guaranteed to be permanently maintainable. The
professional standard is that changes are testable, releases are reproducible,
failures are observable, deployments are reversible, data is recoverable, and
another engineer can take over without relying on undocumented knowledge.

Current overall assessment: **C- / operational but not ready for long-term
unattended maintenance**.

The strongest parts are the current production availability, explicit security
architecture rules, database migration history, RLS boundaries, HTTPS setup,
and documented runtime architecture. The largest blockers are:

1. At audit start, the production server exposed unnecessary `rpcbind` attack
   surface and permitted root/password SSH authentication. This finding has
   since been remediated: `rpcbind`, password SSH, and root SSH login are now
   disabled, and deployment runs as `vaid-deploy`.
2. At audit start, the exact production source was an uncommitted local working
   tree and the active frontend release was manually named. This has since been
   remediated: the production baseline was committed and deployed from Git
   commit `3d2c697302aa460c76b72b9bc9d9ea8a54a9b2ae`.
3. At audit start, a full creator identity-document number was written to
   browser `sessionStorage`. This has since been remediated: the download flow
   now uses current-page memory and clears legacy storage keys.
4. There are no automated tests for frontend, backend, payment, registration,
   RLS, rendering, or recovery behavior.
5. There is no demonstrated end-to-end monitoring, alerting, database backup
   schedule, or restore drill.

## 2. Verified Healthy State

### Production and network

- `https://vaid.top/` returned HTTP 200.
- HTTP and `www` redirect to the canonical HTTPS domain.
- TLS 1.3 is active and the certificate is valid through 2026-08-05.
- `certbot-renew.timer` is active; its 2026-06-18 run completed successfully.
- HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`, and Referrer Policy are
  present.
- Hashed static assets use immutable one-year cache headers.
- Observed homepage TTFB was approximately 15-50 ms during this audit.
- Nginx and `vaid-card-renderer` were active with zero systemd restarts.
- Nginx and renderer journals showed no warning-level entries in the previous
  seven days.
- Root filesystem usage was 22%, with approximately 22 GB available.
- The public renderer health endpoint returned HTTP 200 with `{"ok":true}`.

### Browser behavior

- Homepage and documentation page loaded without browser console warnings or
  errors.
- A 390 x 844 mobile viewport showed no horizontal overflow.
- A real public verification record loaded successfully.
- Its 1024 x 576 canonical preview loaded through the `card-preview` function.
- A nonexistent Record ID produced a controlled "Verification Failed" state.

### Code and build

- `npm run typecheck` passed.
- `npm run build` passed.
- `npm run lint` completed with zero errors and eight warnings.
- The locally built main production asset had the same SHA-256 as the asset
  currently served by production.
- No tracked private key, service-role key, `.env.local`, or credential file
  was found. `.env.production` now contains only public frontend runtime config.
- At audit time, the only apparent private-key pattern in tracked content was
  placeholder text in a legacy Alipay setup document that has since been
  removed from the working tree.

### Backend and database access boundaries

- All 21 expected Supabase Edge Functions were listed as active.
- Anonymous access to `public_v_ids` succeeded as intended.
- Anonymous access to `v_ids`, creator identity claims, evidence materials,
  contact messages, and Alipay orders was rejected with PostgreSQL permission
  error `42501`.
- Anonymous access to `user_quotas` returned zero rows, consistent with RLS
  filtering.
- Local migrations contain explicit RLS policies, service-role restrictions,
  and restricted `SECURITY DEFINER` grants for current sensitive paths.

## 3. Findings by Severity

### P0 - Production host hardening

Initial verified server state:

- TCP and UDP port 111 (`rpcbind`) listened on all interfaces at the time of the
  audit. External reachability could not be reliably established because the
  audit environment intercepted direct port probes.
- `firewalld` is inactive.
- Effective SSH configuration has `PermitRootLogin yes`.
- Effective SSH configuration has `PasswordAuthentication yes`.
- The GitHub deployment key connects directly as `root`.
- `fail2ban` is inactive.
- SSH logs already show unsolicited pre-authentication scanning traffic.

Required outcome:

- Close public TCP/UDP 111 in the Alibaba security group and stop/disable
  `rpcbind` if VAID has no confirmed dependency on it.
- Disable SSH password authentication.
- Disable direct root login after creating and validating a restricted deploy
  user with only the required release and Nginx reload permissions.
- Restrict SSH ingress by source IP or a managed access path where practical.

Remediation status on 2026-06-18:

- `rpcbind.service` and `rpcbind.socket` were stopped, disabled, and masked;
  port 111 no longer appears in the server's listening sockets.
- SSH password authentication was disabled.
- A locked-password `vaid-deploy` account was created and verified with the
  existing deployment key.
- The account has ACL write access only to the VAID release directories and
  exact sudo permissions for `nginx -t` and `systemctl reload nginx`.
- The production deployment workflow was switched to `vaid-deploy`, pushed, and
  validated through GitHub Actions.
- Effective SSH now has `PermitRootLogin no`.
- Root's `authorized_keys` is empty, and root deployment-key login is rejected.

### P0 - Production is not reproducible from Git

Initial verified state:

- Current branch: `codex/strong-proof-ui-entry`.
- Deployment workflow only triggers on `codex/security-architecture-refactor`.
- The working tree contains substantial modified and untracked production code,
  including the renderer, `card-preview`, a migration, runtime documentation,
  fonts, and frontend/backend changes.
- The active frontend release is
  `manual-20260617165000-baidu-verify`, not a Git SHA.
- The local dirty-tree build matches the production main asset, so production
  currently depends on local uncommitted state.

Remediation status on 2026-06-18:

- Current production branch is `codex/strong-proof-ui-entry`.
- Commit `61458453b490c220a2f29415465cd8d21049f596` captured the production
  baseline and deployment workflow changes.
- Commit `3d2c697302aa460c76b72b9bc9d9ea8a54a9b2ae` fixed CI build environment
  loading through `.env.production`.
- GitHub Actions run `27755212614` completed successfully on branch
  `codex/strong-proof-ui-entry`.
- Current release points to
  `/srv/www/vaid.top/releases/3d2c697302aa460c76b72b9bc9d9ea8a54a9b2ae`.

Required outcome:

- Tag the deployed baseline.
- Freeze or merge the old deployment branch so there is one protected production
  branch.
- Add a post-deploy smoke test and automatic rollback before declaring a release
  successful.

### P0 - Full identity-document number in browser storage

Initial verified state:

- `src/App.tsx` wrote the full document number to `sessionStorage`.
- `src/components/CardGenerator.tsx` later read it for the downloadable archive.
- No cleanup occurred after download.

This conflicts with `docs/AI_DEVELOPMENT_CONTEXT.md`, which states that identity
document numbers must never be exposed through browser storage. Session storage
is shorter-lived than local storage, but it remains readable by same-origin
scripts and by any successful XSS during the tab session.

Remediation status on 2026-06-18:

- `src/App.tsx` no longer writes the document number to `sessionStorage` or
  `localStorage`.
- `src/components/CardGenerator.tsx` no longer reads the document number from
  browser storage.
- `src/utils/downloadArchiveIdentity.ts` keeps the document number only in
  current-page JavaScript memory for the download handoff.
- The legacy storage key `vid_download_creator_document_number` is removed on
  home-page startup, new image selection, card-generator initialization, and
  download completion.

Required outcome:

- Remove the full document number from web storage.
- Use the shortest-lived in-memory handoff compatible with the approved download
  flow, then explicitly erase it after use.
- Add an automated regression test that fails if the field is written to local
  or session storage.

### P1 - No automated test safety net

There is no test command and no test file. The frontend TypeScript check only
includes `src`; Supabase Edge Functions are not typechecked by that command.
The current GitHub workflow runs `npm ci` and `npm run build`, but does not run
typecheck, lint, tests, migration checks, or a live smoke test.

Minimum required test set:

1. Anonymous/private RLS boundary tests.
2. Registration atomicity and exactly-one-credit consumption.
3. Payment signature, ownership, amount, and idempotency tests.
4. Duplicate registration and partial-failure tests.
5. Canonical renderer golden-image/hash and QR readability tests.
6. Public verification and invalid-ID browser tests.
7. Evidence and original-file retention/cleanup tests.

### P1 - Known dependency vulnerabilities

`npm audit --omit=dev` reported three high-severity dependency findings with
upgrades available:

- `react-router-dom` / `react-router` 7.13.1
- `ws` 8.20.1 through `@supabase/realtime-js`

Some React Router advisories target server/data-router features that this SPA
may not use, but the direct dependency remains on an affected version. Upgrade
and re-run the audit rather than relying on assumed non-applicability.

### P1 - Monitoring and alerting are not demonstrated

Umami provides analytics, not operational error monitoring. The repository and
host contain no demonstrated alerting for:

- site or API outage;
- Edge Function errors;
- renderer latency, failure rate, memory, or queue depth;
- host memory and disk pressure;
- certificate renewal failure;
- database growth and failed scheduled jobs;
- payment callback failures;
- R2/Supabase storage lifecycle failures.

At minimum, alerts should cover the homepage, one public verification probe,
the renderer health endpoint, Supabase function errors, certificate expiry,
host memory/disk, and payment failure rate.

### P1 - Data recovery is not proven

The local `backups/` directory contains manual database exports from May 2026,
but no current automated backup schedule or successful restore drill was found.
Frontend release directories provide a partial static-site rollback, but they do
not recover PostgreSQL, Supabase Storage, R2 objects, secrets, or server
configuration.

Required outcome:

- Define RPO and RTO.
- Confirm the Supabase plan's actual backup guarantees.
- Create encrypted offsite exports for critical data not covered by those
  guarantees.
- Back up R2 lifecycle-critical metadata and infrastructure configuration.
- Perform and document a restore drill into a non-production environment.

### P1 - Database migration parity could not be proven

The local repository has 37 migrations. A live Supabase migration-list check
failed twice during PostgreSQL TLS negotiation, so this audit cannot prove that
the local migration ledger exactly matches production. The Edge Function list
and anonymous RLS behavior were verified independently.

Required outcome:

- Reconcile local and remote migration histories when the CLI database
  connection is available.
- Make migration parity a release gate.
- Do not rewrite migrations already applied to production.

### P2 - Core modules are too large

The frontend and Edge Function source is approximately 13,756 lines. The largest
files include:

- `src/App.tsx`: 1,642 lines
- `src/components/CardGenerator.tsx`: 1,302 lines
- `src/i18n/config.ts`: 820 lines
- `src/utils/certificateCanvas.ts`: 786 lines
- `src/pages/VerifyPage.tsx`: 636 lines

Do not start a broad refactor before tests exist. After critical-path tests are
in place, split by existing responsibilities: registration orchestration,
identity handoff, evidence upload, download package generation, and rendering.

### P2 - Renderer capacity and recovery

The host has 896 MiB RAM and no swap. The renderer currently uses roughly
122 MiB while idle and starts a Chromium process per render request. There is no
durable queue, concurrency limit, bounded retry, or failed-card recovery path.

This is acceptable only at very low traffic. Before deliberate growth, serialize
rendering or introduce a durable job queue, idempotent retries, metrics, and load
testing.

### P2 - Additional maintainability gaps

- `README.md` contains only `Vid full` and is not an onboarding document.
- Current runtime and architecture documents are useful and now tracked, but the
  repository-level README remains too thin for handoff.
- No repository-level Node version file exists; CI uses Node 20 while this audit
  ran locally on Node 24.
- Homepage has no `h1` or `main` semantic landmark.
- Valid public verification works, but a normal not-found lookup logs a browser
  console error.
- Public avatar orphan cleanup remains unimplemented.
- The server retains many manually named releases without a documented retention
  policy.

## 4. Maintainability Scorecard

| Area | Rating | Evidence |
| --- | --- | --- |
| Current availability | B | Site, redirects, TLS, renderer and public verification healthy |
| Frontend maintainability | C | Build passes, but no tests and very large core files |
| Backend architecture | B- | Explicit auth/RLS design, but no automated function verification |
| Database governance | C | Good migration history; parity and restore not proven |
| Security operations | C | Host SSH/root exposure and browser document-number storage remediated; monitoring and alerting still weak |
| Deployment/rollback | C | GitHub Actions deploys a Git SHA as `vaid-deploy`; rollback automation and release tags still missing |
| Observability | D | Analytics exists; operational alerts and error tracing not demonstrated |
| Recovery | D | Old manual exports; no verified automated backup and restore drill |
| Documentation | B- | Strong internal architecture notes are now tracked; README remains weak |

## 5. Recommended Execution Order

### Within 24 hours

1. Tag the deployed production baseline and freeze or merge the old deployment
   branch.
2. Add a post-deploy smoke test and rollback gate to CI.
3. Add uptime, host, renderer, Supabase, certificate, and payment alerts.

### Within 7 days

1. Upgrade vulnerable dependencies and re-run build/audit checks.
2. Add CI gates for typecheck, lint, tests, build, dependency audit, and smoke
   tests.
3. Add uptime, host, renderer, Supabase, certificate, and payment alerts.
4. Reconcile production database migrations.
5. Define backup RPO/RTO and perform the first restore drill.

### Before growth work

1. Add the critical-path test suite.
2. Add a staging environment for side-effecting end-to-end tests.
3. Add renderer serialization/queueing, retry, idempotency, and load testing.
4. Add orphan cleanup and storage lifecycle monitoring.
5. Refactor large modules only after behavior is protected by tests.

## 6. Audit Limitations

The following were not executed because they would create production side
effects or lacked a safe staging environment:

- new user OTP delivery;
- paid order creation and Alipay callback;
- credit consumption and new VAID registration;
- private evidence upload and deletion;
- destructive backup restoration;
- real Safari, iOS Safari, Firefox, and Android device tests.

These are not assumed healthy. They require a staging environment or an
explicitly controlled production test plan.
