#!/usr/bin/env bash
# Appelle GET /api/cron/mail-sync avec le secret (utilisé par le crontab VPS).
set -euo pipefail

SECRET_FILE="${MAIL_SYNC_ENV_FILE:-/etc/sdcreativ/cron-mail-sync.env}"

if [ -f "$SECRET_FILE" ]; then
  # shellcheck disable=SC1090
  set -a
  # shellcheck source=/dev/null
  source "$SECRET_FILE"
  set +a
fi

: "${CRON_SECRET:?CRON_SECRET manquant}"
: "${SITE_URL:?SITE_URL manquant}"

SITE_URL="${SITE_URL%/}"
curl -fsS \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${SITE_URL}/api/cron/mail-sync"
echo
