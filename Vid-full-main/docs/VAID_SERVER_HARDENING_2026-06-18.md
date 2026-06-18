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
  - `PermitRootLogin prohibit-password`

Root key login remains temporarily because the currently deployed GitHub Actions
workflow still connects as root. Disabling it before the workflow change is
committed and tested would break the next automated deployment.

### Deployment workflow prepared locally

`.github/workflows/deploy.yml` now uploads and activates releases as
`vaid-deploy`, and uses the two exact sudo commands above. The workflow change
has not been pushed or executed.

## Validation

- `sshd -t` passed before and after installation.
- Password-only SSH was rejected.
- `vaid-deploy` key login succeeded.
- Existing root deployment-key login still succeeded.
- `vaid-deploy` created and removed a test directory under `releases`.
- `vaid-deploy` successfully ran `nginx -t` and reloaded Nginx.
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

1. Commit the exact production source baseline and the prepared workflow change.
2. Validate one deployment through GitHub Actions as `vaid-deploy`.
3. Change SSH to `PermitRootLogin no`.
4. Remove the deployment key from root's `authorized_keys`.
5. Re-run the full website and deployment smoke test.
