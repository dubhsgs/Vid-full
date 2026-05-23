# VAID Deployment Archive - Certificate Canvas Rendering

Date: 2026-05-23

## Commit

```text
9ab4277 Stabilize certificate canvas rendering
```

## Scope

- Stabilized shared certificate canvas rendering.
- Kept CardGenerator and VerifyPage on one shared drawing path.
- Forced 2x DPR for downloaded PNG output.
- Added image load timeout protection on CardGenerator.
- Waited for browser fonts before canvas drawing.
- Added shared certificate issue-date formatting.
- Added activation-code admin runbook.

## Verification

Local checks passed before deployment:

```text
npm run typecheck
npm run build
npm run lint
```

Lint result had only existing `src/main.tsx` Fast Refresh warnings.

## Deployment

Push target:

```text
origin codex/security-architecture-refactor
```

The normal GitHub Actions deployment did not switch the live release immediately, so the verified local `dist` build was uploaded manually to Aliyun.

Live release:

```text
/srv/www/vaid.top/releases/9ab4277
```

Nginx verification:

```text
nginx -t
systemctl reload nginx
```

## Online verification

Confirmed `https://vaid.top/` references the new built assets:

```text
/assets/index-Cm_-ce7v.js
/assets/index-B6ERZNRX.css
/assets/CardGenerator-B3BSJ_9R.js
/assets/certificateCanvas-BbEDnQiP.js
```

Confirmed cache headers for hashed assets:

```text
Cache-Control: public, max-age=31536000, immutable
```
