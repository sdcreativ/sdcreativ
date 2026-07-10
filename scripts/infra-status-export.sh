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
COMPOSE_PROFILE="${COMPOSE_PROFILE:-prod}"

mkdir -p "$BACKUP_DIR"

COMPOSE=(docker compose)
# shellcheck disable=SC2206
COMPOSE+=($COMPOSE_FILES)
COMPOSE+=(--profile "$COMPOSE_PROFILE")

disk_used="$(df -P / | awk 'NR==2 {print $5}' | tr -d '%')"
disk_free="$(df -P -BG / | awk 'NR==2 {print $4}' | tr -d 'G')"
disk_total="$(df -P -BG / | awk 'NR==2 {print $2}' | tr -d 'G')"

if crontab -u "$DEPLOY_USER" -l 2>/dev/null | grep -qF 'db-backup.sh'; then
  backup_cron="true"
else
  backup_cron="false"
fi

if crontab -u "$DEPLOY_USER" -l 2>/dev/null | grep -qF 'infra-status-export.sh'; then
  infra_cron="true"
else
  infra_cron="false"
fi

last_log_at="null"
if [ -f /var/log/sdcreativ-backup.log ]; then
  last_log_at="\"$(date -u -r /var/log/sdcreativ-backup.log +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || stat -c %y /var/log/sdcreativ-backup.log | cut -d. -f1 | tr ' ' 'T')Z\""
fi

local_backup_count="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'sdcreativ-*.dump' 2>/dev/null | wc -l | tr -d ' ')"
latest_local_backup="null"
if latest_file="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'sdcreativ-*.dump' -printf '%T@ %f\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)"; then
  [ -n "$latest_file" ] && latest_local_backup="\"${latest_file}\""
fi

docker_status() {
  local svc="$1"
  local cid state

  cid="$("${COMPOSE[@]}" ps -q "$svc" 2>/dev/null | head -1 || true)"
  if [ -z "$cid" ]; then
    echo "unknown"
    return
  fi

  state="$(docker inspect -f '{{.State.Status}}' "$cid" 2>/dev/null || echo "unknown")"
  case "$state" in
    running) echo "running" ;;
    exited|dead|paused) echo "down" ;;
    *) echo "unknown" ;;
  esac
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
  "diskTotalGb": ${disk_total},
  "backupCronInstalled": ${backup_cron},
  "infraCronInstalled": ${infra_cron},
  "lastBackupLogAt": ${last_log_at},
  "localBackupCount": ${local_backup_count},
  "latestLocalBackup": ${latest_local_backup},
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
