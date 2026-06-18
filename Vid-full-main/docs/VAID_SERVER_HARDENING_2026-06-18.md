# VAID Server Hardening Record

Date: 2026-06-18

## Goal

Reduce the production host attack surface without interrupting the website,
renderer, certificate renewal, or the existing deployment path.

## Changes Applied

### rpcbind

- Confirmed there are no NFS mounts or exports.
- Confirmed `nfs-server` and `rpc-statd` are inactive.
- Stopped and disabled `rpcbind.service` and `rpcbind.socket`.
- Masked both units to prevent socket activation.

### SSH

- Created `vaid-deploy` with a locked password.
- Installed the existing deployment public key for that account.
- Granted ACL write access to `/srv/www/vaid.top` and its `releases` directory.
- Granted only these passwordless sudo commands:
  - `/usr/sbin/nginx -t`
  - `/usr/bin/systemctl reload nginx`
- Changed effective SSH policy to:
  - `PasswordAuthentication no`
  - `KbdInteractiveAuthentication no`
  - `ChallengeResponseAuthentication no`
  - `PermitRootLogin no`
- Removed the deployment key from root's `authorized_keys` after the non-root
  deployment path was validated.

### Deployment workflow

`.github/workflows/deploy.yml` uploads and activates releases as `vaid-deploy`,
and uses the two exact sudo commands above. The workflow was pushed and
validated through GitHub Actions on commit
`3d2c697302aa460c76b72b9bc9d9ea8a54a9b2ae`.

## Validation

- `sshd -t` passed before and after installation.
- Password-only SSH was rejected.
- `vaid-deploy` key login succeeded.
- GitHub Actions deployed successfully as `vaid-deploy`.
- Root deployment-key login is now rejected.
- Root's `authorized_keys` is empty.
- `vaid-deploy` created and removed a test directory under `releases`.
- `vaid-deploy` successfully ran `nginx -t` and reloaded Nginx.
- Current release points to
  `/srv/www/vaid.top/releases/3d2c697302aa460c76b72b9bc9d9ea8a54a9b2ae`.
- Nginx, `vaid-card-renderer`, and `certbot-renew.timer` remained active.
- `rpcbind.service` and `rpcbind.socket` remained inactive.
- Server listening sockets no longer included TCP or UDP 111.
- Homepage returned HTTP 200.
- Renderer health endpoint returned HTTP 200.
- No warning-level SSH, Nginx, or renderer journal entries appeared after the
  change.

## Rollback

SSH configuration backup:

`/etc/ssh/sshd_config.pre-vaid-hardening-20260618`

Final root-disable backup:

`/etc/ssh/sshd_config.pre-root-disable-20260618`

Root authorized key backup:

`/root/.ssh/authorized_keys.pre-root-disable-20260618`

SSH rollback sequence:

1. Restore the backup to `/etc/ssh/sshd_config`.
2. Run `sshd -t`.
3. Reload `sshd` only if validation succeeds.

`rpcbind` rollback is permitted only if a real NFS/RPC dependency is later
confirmed:

1. Unmask `rpcbind.service` and `rpcbind.socket`.
2. Enable and start both units.
3. Recheck the required NFS/RPC service and listening ports.

## Remaining Work

No remaining work for this hardening item.

Operational cleanup still recommended: freeze or merge the old
`codex/security-architecture-refactor` deployment branch so future production
publishing happens from one documented branch.
