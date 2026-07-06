#!/usr/bin/env bash
# Installe une tâche cron quotidienne pour sauvegarder PostgreSQL.
#
# Usage (sur le VPS, en root ou utilisateur déployeur) :
#   chmod +x scripts/install-backup-cron.sh scripts/db-backup.sh
#   sudo ./scripts/install-backup-cron.sh
#
# Variables :
#   BACKUP_DIR=/var/backups/sdcreativ
#   CRON_HOUR=3
#   CRON_USER=deploy

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sdcreativ}"
CRON_HOUR="${CRON_HOUR:-3}"
CRON_USER="${CRON_USER:-$(whoami)}"
LOG_FILE="/var/log/sdcreativ-backup.log"

if [ "$(id -u)" -ne 0 ]; then
  echo "Exécutez avec sudo pour installer le cron système."
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chown "$CRON_USER:$CRON_USER" "$BACKUP_DIR" 2>/dev/null || true

touch "$LOG_FILE"
chown "$CRON_USER:$CRON_USER" "$LOG_FILE" 2>/dev/null || true

CRON_LINE="0 ${CRON_HOUR} * * * cd ${ROOT_DIR} && BACKUP_DIR=${BACKUP_DIR} COMPOSE_FILES=\"-f docker-compose.yml -f docker-compose.prod.yml\" ./scripts/db-backup.sh >> ${LOG_FILE} 2>&1"

EXISTING="$(crontab -u "$CRON_USER" -l 2>/dev/null | grep -F 'scripts/db-backup.sh' || true)"

if [ -n "$EXISTING" ]; then
  echo "✓ Cron déjà installé pour ${CRON_USER} :"
  echo "  ${EXISTING}"
  exit 0
fi

(crontab -u "$CRON_USER" -l 2>/dev/null; echo "$CRON_LINE") | crontab -u "$CRON_USER" -

echo "✓ Cron installé pour ${CRON_USER}"
echo "  ${CRON_LINE}"
echo
echo "Sauvegardes : ${BACKUP_DIR}"
echo "Logs        : ${LOG_FILE}"
echo
echo "Test manuel : BACKUP_DIR=${BACKUP_DIR} ./scripts/db-backup.sh"
