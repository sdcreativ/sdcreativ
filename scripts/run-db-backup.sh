#!/usr/bin/env bash
# Wrapper cron pour db-backup.sh : PATH explicite + journalisation début/fin/code.
#
# Usage (cron) :
#   0 3 * * * /var/www/sdcreativ/scripts/run-db-backup.sh >> /var/log/sdcreativ-backup.log 2>&1

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sdcreativ}"
COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yml -f docker-compose.prod.yml}"
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"

cd "$ROOT_DIR" || {
  echo "✗ $(date -Iseconds) — impossible d'accéder à ${ROOT_DIR}"
  exit 1
}

echo
echo "========== $(date -Iseconds) — début sauvegarde =========="
echo "user=$(id -un) uid=$(id -u) cwd=$(pwd)"
echo "docker=$(command -v docker || echo MISSING)"
echo "BACKUP_DIR=${BACKUP_DIR}"
echo "COMPOSE_FILES=${COMPOSE_FILES}"

if [ ! -x "${ROOT_DIR}/scripts/db-backup.sh" ]; then
  chmod +x \
    "${ROOT_DIR}/scripts/db-backup.sh" \
    "${ROOT_DIR}/scripts/backup-s3-upload.sh" \
    "${ROOT_DIR}/scripts/backup-s3-common.sh" \
    "${ROOT_DIR}/scripts/infra-status-export.sh" \
    2>/dev/null || true
fi

set +e
BACKUP_DIR="$BACKUP_DIR" COMPOSE_FILES="$COMPOSE_FILES" \
  bash "${ROOT_DIR}/scripts/db-backup.sh"
exit_code=$?
set -e

echo "========== $(date -Iseconds) — fin sauvegarde (exit=${exit_code}) =========="
exit "$exit_code"
