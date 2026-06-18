# VAID Development Record - Frontend Maintainability Refactor

Date: 2026-06-18
Commit: See Git history for the commit that introduced this file.

## Goal

Separate the homepage, registration workflow, certificate page, and archive
generation responsibilities without changing user-visible behavior or backend
contracts.

## Files Changed

- `src/App.tsx`: retains the homepage shell and shared page-level UI.
- `src/components/home/HomeHero.tsx`: owns the existing hero rendering.
- `src/components/home/ContactModal.tsx`: owns contact form state and submission.
- `src/components/home/RegistrationFlow.tsx`: owns registration, evidence, credit,
  crop, and generation state.
- `src/components/CardGenerator.tsx`: retains certificate-page state and download
  orchestration.
- `src/utils/archiveDownload.ts`: owns PDF, evidence manifest, localized guide,
  and archive naming generation.
- `tests/production-gate.test.mjs`: protects the new module boundaries.
- `docs/AI_DEVELOPMENT_CONTEXT.md`: records the new frontend ownership map.

## Database or Environment Changes

None.

## Security Impact

No security contract changed. Identity document handoff remains in current-page
memory, public verification remains separate, and privileged registration still
uses the existing Edge Functions.

## Verification Performed

Completed successfully:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

The production gate passed 7 tests. TypeScript completed without errors. ESLint
completed with zero errors and the eight pre-existing Fast Refresh warnings in
`src/main.tsx`. The production build completed successfully.

Local browser smoke checks confirmed:

- homepage, registration form, and localized hero render;
- contact modal opens and closes;
- local certificate preview renders a 2048 x 1152 canvas;
- no browser console warnings or errors appeared during the preview check.

## Deployment Status

Pending.

## Rollback Notes

Revert the refactor commit. No database, environment, or server rollback is
required.
