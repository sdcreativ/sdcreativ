#!/usr/bin/env bash
# Installe les tâches cron : sauvegarde quotidienne + export infra (widget CRM).
#
# Usage (sur le VPS, en root ou utilisateur déployeur) :
#   chmod +x scripts/install-backup-cron.sh scripts/db-backup.sh scripts/infra-status-export.sh
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
INFRA_LOG_FILE="/var/log/sdcreativ-infra.log"

if [ "$(id -u)" -ne 0 ]; then
  echo "Exécutez avec sudo pour installer le cron système."
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chown "$CRON_USER:$CRON_USER" "$BACKUP_DIR" 2>/dev/null || true

touch "$LOG_FILE" "$INFRA_LOG_FILE"
chown "$CRON_USER:$CRON_USER" "$LOG_FILE" "$INFRA_LOG_FILE" 2>/dev/null || true

BACKUP_CRON="0 ${CRON_HOUR} * * * cd ${ROOT_DIR} && BACKUP_DIR=${BACKUP_DIR} COMPOSE_FILES=\"-f docker-compose.yml -f docker-compose.prod.yml\" ./scripts/db-backup.sh >> ${LOG_FILE} 2>&1"
INFRA_CRON="*/15 * * * * cd ${ROOT_DIR} && BACKUP_DIR=${BACKUP_DIR} COMPOSE_FILES=\"-f docker-compose.yml -f docker-compose.prod.yml\" ./scripts/infra-status-export.sh >> ${INFRA_LOG_FILE} 2>&1"

CURRENT="$(crontab -u "$CRON_USER" -l 2>/dev/null || true)"
NEXT="$CURRENT"

if ! echo "$CURRENT" | grep -qF 'scripts/db-backup.sh'; then
  NEXT="${NEXT}
${BACKUP_CRON}"
  echo "✓ Cron backup ajouté"
else
  echo "✓ Cron backup déjà présent"
fi

if ! echo "$CURRENT" | grep -qF 'scripts/infra-status-export.sh'; then
  NEXT="${NEXT}
${INFRA_CRON}"
  echo "✓ Cron infra ajouté (toutes les 15 min)"
else
  echo "✓ Cron infra déjà présent"
fi

if [ "$NEXT" != "$CURRENT" ]; then
  printf '%s\n' "$NEXT" | sed '/^$/d' | crontab -u "$CRON_USER" -
fi

echo
echo "Sauvegardes : ${BACKUP_DIR}"
echo "Logs backup : ${LOG_FILE}"
echo "Logs infra  : ${INFRA_LOG_FILE}"
echo
echo "Test manuel :"
echo "  BACKUP_DIR=${BACKUP_DIR} ./scripts/db-backup.sh"
echo "  BACKUP_DIR=${BACKUP_DIR} ./scripts/infra-status-export.sh"
