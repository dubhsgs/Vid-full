# VAID Development Record - Monitoring SSH Alert Reduction

Date: 2026-06-22
Commit: Reduce scheduled monitor SSH noise

## Goal

Stop Aliyun unusual-login emails caused by scheduled GitHub Actions monitor
runs while preserving production public endpoint monitoring.

## Files Changed

- `.github/workflows/production-monitor.yml`
- `Vid-full-main/docs/VAID_MASTER_HANDOFF.md`
- `Vid-full-main/docs/VAID_MONITORING_AND_RECOVERY_RUNBOOK_2026-06-18.md`
- `Vid-full-main/docs/VAID_DEVELOPMENT_RECORD_MONITORING_AND_LOCAL_BACKUP_2026-06-19.md`
- `Vid-full-main/docs/README.md`
- `Vid-full-main/docs/VAID_DEVELOPMENT_RECORD_MONITORING_SSH_ALERT_REDUCTION_2026-06-22.md`

## Database or Environment Changes

None.

## Security Impact

- Scheduled monitor runs no longer SSH into the Aliyun server from
  GitHub-hosted runner IPs.
- Public endpoint monitoring remains scheduled every 15 minutes.
- Server service/resource checks remain available through manual
  `workflow_dispatch`.
- This reduces noisy Aliyun unusual-login alerts without weakening SSH policy.

## Verification Performed

- Inspected `.github/workflows/production-monitor.yml` and confirmed the
  previous scheduled workflow included a `server-health` SSH job.
- Added `if: github.event_name == 'workflow_dispatch'` to the `server-health`
  job.
- `ruby -e 'require "yaml"; YAML.load_file(".github/workflows/production-monitor.yml"); puts "yaml ok"'`
  passed.
- `git diff --check` passed.
- `npm test` passed: 7 tests.
- `npm run typecheck` passed.
- `npm run lint` passed with the existing 8 React Fast Refresh warnings in
  `src/main.tsx`.
- `npm run build` passed.
- Did not manually dispatch the monitor workflow after this change, because
  manual dispatch intentionally still performs one SSH login.

## Deployment Status

Pending commit, push, and GitHub Actions deploy verification.

## Rollback Notes

Remove the `if: github.event_name == 'workflow_dispatch'` guard from the
`server-health` job to restore scheduled SSH-based server checks. Expect Aliyun
unusual-login alerts to resume if that rollback is deployed.
