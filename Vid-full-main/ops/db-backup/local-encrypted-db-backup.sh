#!/usr/bin/env bash
set -euo pipefail

PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
umask 077

BACKUP_ROOT="${VAID_BACKUP_ROOT:-/Users/yan/Documents/VAID/backups}"
DB_URL_SERVICE="VAID_SUPABASE_DB_URL"
PASSPHRASE_SERVICE="VAID_BACKUP_ENCRYPTION_PASSPHRASE"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="$(mktemp -d /private/tmp/vaid-db-backup.XXXXXX)"
passfile="$(mktemp /private/tmp/vaid-backup-passphrase.XXXXXX)"
plain_archive="/private/tmp/vaid-db-backup-${stamp}.tar.gz"
encrypted_archive="${BACKUP_ROOT}/vaid-db-backup-${stamp}.tar.gz.gpg"

cleanup() {
  rm -rf "$backup_dir"
  rm -f "$plain_archive" "$passfile"
}
trap cleanup EXIT

mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"

db_url="$(security find-generic-password -a VAID -s "$DB_URL_SERVICE" -w)"
security find-generic-password -a VAID -s "$PASSPHRASE_SERVICE" -w > "$passfile"
chmod 600 "$passfile"

pg_dump --dbname="$db_url" --schema-only --no-owner \
  --file="$backup_dir/vaid-schema-${stamp}.sql"
pg_dump --dbname="$db_url" --data-only --no-owner \
  --file="$backup_dir/vaid-data-${stamp}.sql"

test -s "$backup_dir/vaid-schema-${stamp}.sql"
test -s "$backup_dir/vaid-data-${stamp}.sql"

tar -C "$backup_dir" -czf "$plain_archive" .
gpg --batch --yes --pinentry-mode loopback \
  --passphrase-file "$passfile" \
  --symmetric --cipher-algo AES256 \
  -o "$encrypted_archive" "$plain_archive"

test -s "$encrypted_archive"
find "$BACKUP_ROOT" -maxdepth 1 -name 'vaid-db-backup-*.tar.gz.gpg' -mtime +14 -delete

stat -f 'encrypted_backup=%N bytes=%z' "$encrypted_archive"
