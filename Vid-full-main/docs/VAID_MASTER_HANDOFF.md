# VAID Master Operations and AI Handoff

Last verified: 2026-06-18 (Asia/Shanghai)
Authority: canonical current handoff for this repository

## 1. How To Use This Document

Read this file before changing VAID. It is the single current entry point for
product boundaries, architecture, security, deployment, operations, recovery,
and known limitations.

When information conflicts, use this priority order:

1. Current production behavior and current source code.
2. Applied database schema and current infrastructure configuration.
3. This master handoff.
4. Current focused runbooks linked from this file.
5. Dated audits, development records, and Git history.

Never treat a proposal, draft, session memory, or old deployment archive as a
current instruction. After a material production change, update this file and
the relevant focused runbook in the same change.

## 2. Current Executive State

VAID is live and operational at `https://vaid.top`.

Verified production state on 2026-06-18:

- Active release:
  `34a152bd32a408e46f8d2f20fa578e892a68b959`.
- GitHub Actions deployment run `27769856430` completed successfully.
- Homepage returned HTTP 200.
- Renderer health returned HTTP 200 with `{"ok":true}`.
- `nginx`, `vaid-card-renderer`, and `certbot-renew.timer` were active.
- `rpcbind.service` and `rpcbind.socket` were inactive.
- Root disk usage was 23%.
- Available memory was approximately 508 MiB.
- Production deploys are reproducible from Git and use immutable release
  directories.
- The CI gate runs tests, TypeScript, ESLint, and the production build.
- The frontend maintainability refactor is deployed.

Do not describe the project as permanently maintainable or in a perfect state.
The current high-priority gaps are:

1. Scheduled production monitoring is not active because GitHub's default
   branch is `main`, while the workflow files exist only on
   `codex/strong-proof-ui-entry`.
2. Scheduled encrypted database backup is not active for the same reason.
3. Backup secrets are not proven configured and no isolated database restore
   drill has been completed.
4. `npm audit --omit=dev` currently reports three high-severity dependency
   findings: `react-router`, `react-router-dom`, and transitive `ws`.
5. Production database migration parity has not been conclusively reconciled
   against the local migration ledger.
6. The current tests are valuable static/contract gates, but they are not a
   complete live RLS, payment, browser, renderer golden-image, or restore test
   suite.
7. The renderer has limited host memory and no durable render queue, concurrency
   limit, or automatic failed-card retry path.

## 3. Product Definition

VAID helps creators create a verifiable archive record for original digital
works, virtual characters, and AI-generated works before publication or
sharing.

Target users:

- independent artists and illustrators;
- original-character and digital-IP creators;
- AI visual creators;
- small creative teams needing a lightweight pre-publication archive.

Approved claim boundary:

- VAID provides records, timestamps, verification, and supporting evidence.
- VAID is not copyright registration, notarization, judicial certification,
  administrative ownership confirmation, or a guaranteed legal determination.

Current product shape:

- homepage and registration flow;
- Supabase email OTP authentication;
- credit and activation-code access control;
- Alipay purchase flow;
- public verification page;
- one-time post-generation download page;
- private creator identity claim;
- optional private evidence metadata and hashes;
- OTS timestamp proof processing.

Not currently implemented:

- user dashboard;
- historical record list;
- durable re-download center;
- frontend admin panel;
- automatic identity/evidence retry UI after a partial failure.

## 4. Repository and Production Map

| Item | Current value |
| --- | --- |
| Repository root | `/Users/yan/Documents/VAID` |
| App root | `/Users/yan/Documents/VAID/Vid-full-main` |
| GitHub repository | `git@github.com:dubhsgs/Vid-full.git` |
| GitHub default branch | `main` |
| Production branch | `codex/strong-proof-ui-entry` |
| Production site | `https://vaid.top` |
| Server | Aliyun `47.93.232.20` |
| Deploy account | `vaid-deploy` |
| Active symlink | `/srv/www/vaid.top/current` |
| Release directories | `/srv/www/vaid.top/releases/<GITHUB_SHA>` |
| Renderer directory | `/srv/www/vaid-card-renderer` |
| Supabase project ref | `vimglsksvvvnxkjnaqeh` |

Important branch warning:

- Normal production deploys trigger from `codex/strong-proof-ui-entry`.
- GitHub scheduled workflows only run from the default branch.
- Do not assume a scheduled workflow is active merely because its YAML exists
  on the production branch.

Local-only or generated paths that must never be committed:

- `.deploy_keys/`;
- `.env.local`;
- `outputs/`;
- `backups/`;
- `Vid-full-main/node_modules/`;
- `Vid-full-main/dist/`;
- `Vid-full-main/supabase/.temp/`;
- `.DS_Store`.

## 5. Technology Stack

Frontend:

- React 18;
- TypeScript;
- Vite 6;
- React Router 7;
- Tailwind CSS;
- i18next;
- Supabase JavaScript client;
- JSZip and QRCode for download artifacts.

Backend and data:

- Supabase Auth email OTP;
- Supabase PostgreSQL;
- Supabase Edge Functions;
- Supabase Storage;
- PostgreSQL RLS, RPC, `pg_cron`, and `pg_net`;
- Cloudflare R2 for card previews and temporary private evidence uploads.

Production runtime:

- Nginx static SPA hosting;
- Node.js/Playwright controlled card renderer;
- Chromium headless;
- systemd;
- Let's Encrypt/Certbot;
- GitHub Actions deployment.

## 6. Frontend Ownership Map

Entry and routes:

- `src/main.tsx`: React root, BrowserRouter, lazy route registration.
- `src/App.tsx`: homepage shell, header, language prompt, process section,
  footer, and composition only.
- `src/components/home/RegistrationFlow.tsx`: registration, crop, credits,
  identity, evidence, and generation orchestration.
- `src/components/home/HomeHero.tsx`: homepage hero rendering.
- `src/components/home/ContactModal.tsx`: contact form state and submission.
- `src/components/CardGenerator.tsx`: result-page state, card rendering, and
  download orchestration.
- `src/utils/archiveDownload.ts`: PDF, evidence manifest, guide, and localized
  archive naming.
- `src/utils/certificateCanvas.ts`: shared canonical card canvas renderer.

Routes:

| Route | Component | Responsibility |
| --- | --- | --- |
| `/` | `App` | Homepage and registration |
| `/card-generator` | `CardGenerator` | One-time result and ZIP download |
| `/verify/:id` | `VerifyPage` | Public record verification |
| `/privacy` | `PrivacyPage` | Privacy policy |
| `/terms` | `TermsPage` | Terms |
| `/docs` | `DocsPage` | User documentation |
| `/payment-success` | `PaymentSuccessPage` | Alipay return/status check |
| `/card-renderer` | `CardRendererPage` | Controlled renderer page |
| `*` | `NotFoundPage` | 404 |

`AppWithRouter.tsx` is not the active production entry path. Production routing
is defined by `src/main.tsx`.

## 7. Core User and Data Flow

### 7.1 Authentication

1. User enters email in `AuthControl`.
2. Frontend calls Supabase email OTP.
3. OTP/code exchange establishes a Supabase session.
4. Registration requires an authenticated, email-confirmed user.

### 7.2 Registration

1. User selects an original image, character/work name, creator name, country,
   document type, and document number.
2. Frontend restricts the original image to JPEG, PNG, WebP, or GIF and 8 MB.
3. User crops a 240 x 240 circular avatar preview.
4. Frontend checks authentication and available credits.
5. Frontend computes the original SHA-256.
6. Full original uploads temporarily to private `v-id-originals`.
7. Cropped avatar uploads to public `v-id-images/avatars/<user_id>/...`.
8. Frontend invokes `v-id-register`.
9. Backend validates ownership/path/MIME/size and recomputes SHA-256 from the
   original file.
10. RPC `register_v_id` atomically consumes one credit, creates the `v_ids`
    record, and inserts the OTS job.
11. Backend invokes the controlled renderer and stores a compressed card
    preview in private R2 when rendering succeeds.
12. Full original is deleted in backend cleanup; stale abandoned originals are
    also covered by scheduled cleanup logic.
13. Frontend registers encrypted creator identity separately.
14. Optional evidence files upload temporarily to private R2; only metadata and
    hashes are retained after completion.
15. Frontend opens the one-time card result page.

Partial-failure rule:

- A database record and credit consumption may already be committed before
  identity, evidence, renderer, or browser download steps fail.
- Never report all later-stage failures as if no VAID record exists.

### 7.3 Card generation and download

The controlled renderer:

- runs on `127.0.0.1:8787` as `vaid-card-renderer.service`;
- is proxied by Nginx under `/internal/card-renderer/`;
- requires `x-vaid-card-renderer-secret` for render requests;
- opens `/card-renderer#<payload>` in controlled Chromium;
- returns a 2048 x 1152 lossless PNG for the immediate user session;
- returns a 1024 x 576 compressed preview for long-term verification display.

The ZIP download contains:

1. digital identity card PNG;
2. archive certificate PDF;
3. verification guide TXT;
4. OTS proof file when available.

The high-resolution PNG is not retained long-term by VAID. The result page is
not a durable re-download center and depends on browser handoff state.

### 7.4 Public verification

`VerifyPage` reads only from `public_v_ids` with an explicit field list. It may
show Record ID, character name, creator name, avatar, card preview/status,
creation time, and OTS status.

It must never expose user ID, original hash, private evidence, identity
documents, payment data, OTS file path, or service credentials.

### 7.5 Credits, activation codes, and Alipay

- Credits live in `user_credits`.
- Registration consumes credit inside the backend RPC, never only in frontend
  state.
- Activation codes live in `license_keys` and are redeemed through backend
  functions.
- `alipay-create-order` requires authenticated ownership and approved prices.
- `alipay-notify` verifies signature, app ID, seller identity, amount, status,
  and idempotent settlement.
- `alipay-query-order` verifies ownership before returning order state.

Current package prices in the production gate are 1 credit for CNY 9.9, 5 for
CNY 39.9, and 10 for CNY 69.9. Pricing changes require explicit user approval.

## 8. Data Model and Access Boundaries

Current primary objects:

| Object | Purpose | Public access |
| --- | --- | --- |
| `profiles` | Auth user profile | Owner only |
| `user_credits` | Free/paid credit balance | Owner only |
| `v_ids` | Private canonical VAID records | Owner/service only |
| `public_v_ids` | Restricted verification view | Readable publicly |
| `ots_jobs` | OTS processing jobs | Not public |
| `alipay_orders` | User payment orders | Owner/service only |
| `license_keys` | Activation codes | Backend-controlled |
| `v_id_creator_identity_claims` | Encrypted identity claims | Owner/service only |
| `v_id_evidence_materials` | Private evidence metadata/hashes | Owner/service only |
| `v_id_evidence_upload_sessions` | Temporary R2 upload sessions | Owner/service only |
| `contact_messages` | Contact submissions | Service/admin only |
| `free_credit_claims` | Abuse-control claim ledger | Backend-controlled |
| `v_id_claim_audit` | Legacy claim audit | Restricted |

Historical tables such as `user_quotas`, `payment_orders`, and `afdian_orders`
may still exist for compatibility or migration history. New code must not use
them as the primary current credit/payment model without a deliberate migration.

Database rules:

- Add new migrations; never rewrite applied migrations.
- Privileged writes go through Edge Functions and service-role RPCs.
- Public verification uses `public_v_ids`, not `v_ids`.
- RLS is a security boundary; the anon key is not a secret.
- Reconcile remote/local migration parity before claiming the ledger is exact.

## 9. Storage Lifecycle

| Data | Storage | Visibility | Retention |
| --- | --- | --- | --- |
| Full original work | Supabase `v-id-originals` | Private | Temporary; delete after attempt and stale cleanup |
| Cropped avatar | Supabase `v-id-images/avatars` | Public | Long-term; orphan cleanup remains incomplete |
| Standard card preview | R2 `vaid-cards/cards/` | Private object via `card-preview` | Long-term |
| Lossless download PNG | Browser current session | User-local | Not retained by VAID |
| OTS proof | Supabase `v-id-ots` | Private | Long-term |
| Evidence original | R2 `vaid-evidence/evidence/` | Private | Temporary; deleted after completion/cleanup |
| Evidence metadata/hash | PostgreSQL | Owner only | Long-term |
| Creator identity | PostgreSQL encrypted claim | Owner only | Long-term |

The legacy Supabase evidence bucket path is disabled for new uploads. Current
evidence originals use temporary R2 upload sessions.

## 10. Edge Function Catalog

Current production-relevant functions:

- Registration: `v-id-register`, `creator-identity-register`.
- Evidence: `evidence-upload-init`, `evidence-upload-complete`,
  `evidence-cleanup`.
- Card serving: `card-preview`.
- Original cleanup: `original-cleanup`.
- OTS: `ots-worker`, `ots-stamp`, `ots-verify`, `ots-download`.
- Payment: `alipay-create-order`, `alipay-notify`, `alipay-query-order`.
- Credits/codes: `quota-check`, `license-key-status`, `license-key-use`.
- Contact: `contact-submit`.

Legacy or compatibility functions still present include `quota-use`,
`claim-vid`, and `evidence-material-register`. Inspect the current code and
migrations before using them. `quota-use` is intentionally deprecated for
registration; the atomic `v-id-register` path is the required flow.

Shared code is under `supabase/functions/_shared`. Rollback source snapshots
under `_rollback_backups` are historical, not deployable current functions.

## 11. Configuration and Secret Inventory

Never place secret values in Markdown, Git, frontend code, logs, or screenshots.
This section records names and ownership only.

Frontend build variables:

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_ANON_KEY`;
- optional `VITE_UMAMI_SRC`;
- optional `VITE_UMAMI_WEBSITE_ID`;
- optional `VITE_UMAMI_DOMAINS`;
- development-only `VITE_ENABLE_DEV_MODE`;
- optional `VITE_MAINTENANCE_MODE` in unused/legacy entry code.

`.env.production` contains only public frontend runtime configuration. Do not
put service-role, payment, R2, renderer, or encryption secrets there.

GitHub Actions secrets:

- `VAID_DEPLOY_SSH_KEY`;
- `SUPABASE_DB_URL` for database backup;
- `BACKUP_ENCRYPTION_PASSPHRASE` for encrypted backup artifacts.

Supabase Edge Function secrets/config:

- Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`;
- identity: `IDENTITY_ENCRYPTION_KEY`;
- renderer: `CARD_RENDERER_URL`, `CARD_RENDERER_SECRET`;
- Alipay: `ALIPAY_APP_ID`, `ALIPAY_PRIVATE_KEY`, `ALIPAY_PUBLIC_KEY`,
  `ALIPAY_SELLER_ID`, `ALIPAY_SELLER_EMAIL`,
  `ALIPAY_RETURN_URL_ALLOWLIST`;
- site: `SITE_URL`, `PUBLIC_SITE_URL`;
- contact: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`,
  `CONTACT_RATE_LIMIT_SALT`;
- abuse control: `FREE_CREDIT_CLAIM_SALT`;
- R2 credentials/buckets are read through `_shared/r2.ts`; inspect that file
  before rotating them. Current names are `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_EVIDENCE_BUCKET`, and `R2_CARDS_BUCKET`.

Renderer host environment file `/etc/vaid-card-renderer.env` uses:

- `VAID_CARD_RENDERER_SECRET`;
- `FRONTEND_ORIGIN`;
- optional `PORT`;
- optional `CHROMIUM_EXECUTABLE_PATH`;
- optional `VAID_CARD_RENDER_VERSION`.

## 12. Security Non-Negotiables

1. Never expose service-role, payment private, deploy, R2, renderer, Resend, or
   identity-encryption secrets.
2. Never write full identity document numbers to `localStorage` or
   `sessionStorage`.
3. Keep document-number handoff in current-page memory and clear it after use.
4. Encrypt identity document numbers server-side; public output may never
   expose them.
5. Public verification reads only the restricted view and explicit fields.
6. Registration must atomically validate, consume exactly one credit, create
   the record, and enqueue OTS work.
7. Payment settlement must verify signature, app, seller, amount, ownership,
   status, and idempotency.
8. Private evidence originals are temporary; public pages must not reveal
   evidence metadata or object paths.
9. Logs must not contain personal data, raw payment callbacks, original file
   contents, or secrets.
10. Root SSH, password SSH, and `rpcbind` must remain disabled.
11. Do not change certificate canvas coordinates, labels, QR placement, prices,
   privacy copy, public fields, or Record ID format without explicit approval.

Current document-number validation product rule is advisory/coarse rather than
country-format hard blocking. Do not reintroduce strict country validators
without explicit product approval and synchronized frontend/backend changes.

## 13. Development and Test Contract

Before editing:

1. Read `/AGENTS.md` and this file.
2. Confirm scope and production risk.
3. Check `git status --short --branch`.
4. Do not touch unrelated local changes or generated directories.
5. Add or update a focused test when behavior or a critical contract changes.

Required local gate from `Vid-full-main`:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Current expected baseline:

- 7 production-gate tests pass;
- TypeScript passes;
- ESLint exits zero with eight known Fast Refresh warnings in `src/main.tsx`;
- Vite production build passes.

The current gate protects registration atomicity, payment settlement, RLS
contracts, identity browser-storage privacy, public verification fields,
controlled card generation, and frontend module boundaries.

Known test gaps:

- live database RLS integration tests;
- payment provider sandbox/end-to-end tests;
- duplicate and partial-failure browser flows;
- renderer golden-image and QR readability tests;
- multi-browser/mobile automation;
- cleanup lifecycle tests;
- backup restoration tests.

## 14. Standard Release and Rollback

Normal release:

1. Work on `codex/strong-proof-ui-entry`.
2. Run all four local gates.
3. Stage only intentional files.
4. Commit with a focused message.
5. Push to `origin/codex/strong-proof-ui-entry` only after user approval.
6. Confirm GitHub Actions `Deploy VAID` succeeds for the exact SHA.
7. Confirm `/srv/www/vaid.top/current` points to that SHA.
8. Check homepage, public verification, renderer health, services, and logs.

Do not manually upload `dist` during a normal release. Manual deployment is
reserved for a declared emergency with explicit risk acceptance.

Static rollback pattern:

```bash
TARGET=/srv/www/vaid.top/releases/<known_good_sha>
CURRENT=/srv/www/vaid.top/current
test -d "$TARGET"
ln -sfn "$TARGET" "$CURRENT"
sudo /usr/sbin/nginx -t
sudo /usr/bin/systemctl reload nginx
```

After rollback, repeat the full production health checks. The tag
`production-2026-06-18` exists as a baseline, but always resolve and inspect
its SHA before use. At this verification it resolved to
`49a12fc8d2629b03e886969b0bc380b35eb1ec7c`.

## 15. Monitoring, Backup, and Recovery Truth

Repository files:

- `.github/workflows/production-monitor.yml`;
- `.github/workflows/database-backup.yml`;
- `docs/VAID_MONITORING_AND_RECOVERY_RUNBOOK_2026-06-18.md`.

Intended monitoring checks:

- homepage;
- one public verification record;
- renderer health;
- Supabase `public_v_ids` REST access;
- current release path;
- Nginx, renderer, and Certbot;
- `rpcbind` remains inactive;
- disk below 80%;
- available memory above 150 MB;
- no warning-level Nginx/renderer logs in the previous 15 minutes.

Current activation status:

- GitHub default branch is `main`.
- `main` contains no workflow files.
- GitHub API returns `Not Found` for monitor and backup workflow run history.
- Therefore scheduled monitoring and backup are not active.
- Do not claim an RPO or alert SLA until this is corrected and observed.

Required operational completion:

1. Establish one canonical default/production branch or install the scheduled
   workflow definitions on the default branch.
2. Confirm GitHub notification ownership for failures.
3. Configure and verify `SUPABASE_DB_URL` and
   `BACKUP_ENCRYPTION_PASSPHRASE`.
4. Observe at least one successful encrypted backup artifact.
5. Restore that artifact into a separate staging/local database.
6. Verify critical tables, public view, row counts, and RLS boundaries.
7. Record measured RPO/RTO and the drill evidence.
8. Add offsite retention for Postgres and separate backup coverage for
   Supabase Storage, R2 objects, secrets inventory, and server configuration.

Never restore a drill backup into production.

## 16. Server Operations

Expected services:

- `nginx`: active;
- `vaid-card-renderer`: active;
- `certbot-renew.timer`: active;
- `rpcbind.service`: inactive/masked;
- `rpcbind.socket`: inactive/masked.

Expected security posture:

- SSH password authentication disabled;
- root SSH login disabled;
- deploy key uses restricted `vaid-deploy` account;
- deploy user can write release directories and sudo only exact Nginx test and
  reload commands;
- renderer runs as `nginx`, uses `NoNewPrivileges`, and binds loopback only.

Useful checks:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://vaid.top/
curl -sS https://vaid.top/internal/card-renderer/health
readlink -f /srv/www/vaid.top/current
systemctl is-active nginx vaid-card-renderer certbot-renew.timer
systemctl is-active rpcbind.service rpcbind.socket
journalctl -u nginx -u vaid-card-renderer --since=-15min -p warning --no-pager
df -h /
free -m
```

## 17. Routine Maintenance

After every release:

- verify CI for the exact SHA;
- verify active release symlink;
- smoke-test homepage, verification page, and renderer health;
- check services and warning logs;
- record any database/environment changes and rollback notes.

Weekly until monitoring is active:

- manually check site/API/renderer;
- review Nginx and renderer warnings;
- check disk and memory;
- review failed card render states and OTS jobs;
- review failed payments/contact delivery where operational access allows.

Monthly:

- run `npm audit --omit=dev` and review fixes for actual SPA exposure;
- review Supabase Edge Function and migration parity;
- inspect storage growth and orphan avatars;
- verify certificate renewal;
- test a known rollback target;
- review secrets rotation ownership without exposing values;
- update this handoff when facts change.

## 18. Known Risks and Recommended Order

P0 operational completion:

1. Activate scheduled monitoring on the GitHub default branch.
2. Activate encrypted database backup and complete a non-production restore
   drill.
3. Reconcile the production migration ledger.

P1 security/reliability:

1. Upgrade or otherwise resolve the current high-severity dependency findings,
   then run the full gate and browser smoke tests.
2. Add live integration tests for RLS, registration, and payment.
3. Add renderer concurrency control, bounded retries, and failed-card recovery.
4. Add cleanup for unused public avatar uploads.
5. Improve partial-failure recovery for identity and evidence stages.

P2 product/operations:

1. Build a user record/re-download dashboard only after validating demand and
   defining retention/privacy scope.
2. Add stronger incident notifications and provider-specific observability.
3. Establish external backup retention for Postgres, R2, Storage, configuration,
   and secrets inventory.

## 19. New AI Takeover Checklist

A new AI must do this before making changes:

1. Read `/AGENTS.md`.
2. Read this master handoff.
3. Read `docs/README.md` to select only relevant focused runbooks.
4. Run `git status --short --branch` and identify unrelated local files.
5. Confirm whether the request is product research, code change, production
   deployment, or operations.
6. State assumptions, scope, success criteria, and production risk.
7. Inspect current code rather than trusting a dated snapshot.
8. Preserve security and privacy invariants.
9. Run the four required gates.
10. Do not push or deploy without explicit user approval.
11. After an approved release, verify the exact SHA in production.
12. Update this document when a current fact or operational contract changes.

## 20. Focused Current Runbooks

- Release and rollback:
  `docs/VAID_AI_RELEASE_AND_HANDOFF_RUNBOOK_2026-06-18.md`.
- Monitoring, backup, and restore:
  `docs/VAID_MONITORING_AND_RECOVERY_RUNBOOK_2026-06-18.md`.
- Server hardening evidence:
  `docs/VAID_SERVER_HARDENING_2026-06-18.md`.
- Architecture/security rules:
  `docs/AI_DEVELOPMENT_CONTEXT.md`.
- Documentation authority map:
  `docs/README.md`.

Dated audits and development records are evidence, not current operating
instructions. Use Git history for deleted obsolete drafts and session notes.
