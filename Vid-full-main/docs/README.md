# VAID Documentation Index

Last reviewed: 2026-06-18

## Start Here

1. Repository rules: `/AGENTS.md`.
2. Canonical current handoff: `VAID_MASTER_HANDOFF.md`.
3. Select a focused runbook below only when the task requires it.

## Current Authoritative Documents

| Document | Use |
| --- | --- |
| `VAID_MASTER_HANDOFF.md` | Current product, architecture, security, operations, risks, and takeover checklist |
| `AI_DEVELOPMENT_CONTEXT.md` | Architecture and security change contract |
| `VAID_AI_RELEASE_AND_HANDOFF_RUNBOOK_2026-06-18.md` | Release, verification, rollback |
| `VAID_MONITORING_AND_RECOVERY_RUNBOOK_2026-06-18.md` | Monitoring, backup, restore, and current activation gap |
| `VAID_SERVER_HARDENING_2026-06-18.md` | Applied server hardening evidence and rollback |
| `activation_code_admin_runbook_2026-05-22.md` | Activation-code administration; verify code/schema before use |
| `supabase_auth_otp_email_template_2026-05-21.md` | Current OTP email template reference |

## Historical Evidence, Not Current Instructions

- `VAID_POST_LAUNCH_HEALTH_AUDIT_2026-06-18.md`: audit snapshot whose findings
  were partly remediated later the same day.
- `VAID_CURRENT_RUNTIME_2026-06-15.md`: detailed runtime snapshot before the
  2026-06-18 frontend refactor and operations work.
- `VAID_ARCHITECTURE_DECISIONS_2026-06-15.md`: decision snapshot and rationale.
- `development_record_*.md`: immutable implementation evidence.
- `VAID_DEVELOPMENT_RECORD_MAINTAINABILITY_REFACTOR_2026-06-18.md`: frontend
  refactor evidence.
- `deployment_archive_2026-05-23_canvas_rendering.md`: old deployment evidence.

If a historical document conflicts with the master handoff or current code,
do not follow it. Verify current behavior and update the master handoff.

## Removed Obsolete Documents

Old session memories, pre-refactor security drafts, old cutover instructions,
and obsolete asset/template/payment/ICP setup notes were removed from the
working tree because they described replaced architecture or temporary paths.
They remain recoverable from Git history when historical investigation is
necessary.
