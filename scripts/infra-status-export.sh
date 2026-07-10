#!/usr/bin/env bash
# Exporte l'état infra VPS (disque, Docker, cron) pour le widget CRM.
#
# Usage :
#   ./scripts/infra-status-export.sh
#
# Variables :
#   BACKUP_DIR=/var/backups/sdcreativ
#   ROOT_DIR=/var/www/sdcreativ
#   DEPLOY_USER=deploy

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sdcreativ}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
OUT="${INFRA_STATUS_FILE:-${BACKUP_DIR}/infra-status.json}"
COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yml -f docker-compose.prod.yml}"

mkdir -p "$BACKUP_DIR"

COMPOSE=(docker compose)
# shellcheck disable=SC2206
COMPOSE+=($COMPOSE_FILES)

disk_used="$(df -P / | awk 'NR==2 {print $5}' | tr -d '%')"
disk_free="$(df -P -BG / | awk 'NR==2 {print $4}' | tr -d 'G')"

if crontab -u "$DEPLOY_USER" -l 2>/dev/null | grep -qF 'db-backup.sh'; then
  backup_cron="true"
else
  backup_cron="false"
fi

last_log_at="null"
if [ -f /var/log/sdcreativ-backup.log ]; then
  last_log_at="\"$(date -u -r /var/log/sdcreativ-backup.log +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || stat -c %y /var/log/sdcreativ-backup.log | cut -d. -f1 | tr ' ' 'T')Z\""
fi

docker_status() {
  local svc="$1"
  local line
  line="$("${COMPOSE[@]}" ps "$svc" 2>/dev/null | tail -n +2 | head -1 || true)"
  if echo "$line" | grep -qi running; then
    echo "running"
  elif echo "$line" | grep -qiE 'exit|exited'; then
    echo "down"
  elif [ -z "$line" ]; then
    echo "unknown"
  else
    echo "unknown"
  fi
}

app_status="$(docker_status app)"
postgres_status="$(docker_status postgres)"
redis_status="$(docker_status redis)"
nginx_status="$(docker_status nginx)"
certbot_status="$(docker_status certbot)"

hostname="$(hostname -f 2>/dev/null || hostname)"

cat > "$OUT" <<EOF
{
  "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hostname": "${hostname}",
  "environment": "production",
  "diskUsedPercent": ${disk_used},
  "diskFreeGb": ${disk_free},
  "backupCronInstalled": ${backup_cron},
  "lastBackupLogAt": ${last_log_at},
  "docker": {
    "app": "${app_status}",
    "postgres": "${postgres_status}",
    "redis": "${redis_status}",
    "nginx": "${nginx_status}",
    "certbot": "${certbot_status}"
  }
}
EOF

echo "✓ Infra status → ${OUT}"
