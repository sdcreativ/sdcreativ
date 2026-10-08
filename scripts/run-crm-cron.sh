#!/usr/bin/env bash
# Appelle une ou plusieurs tâches /api/cron/<job> du CRM (Bearer CRON_SECRET) et journalise le résultat.
# Installé sur le VPS dans /usr/local/sbin/sdcreativ-cron (hors du dépôt, pour ne pas gêner git pull).
# Secret : /etc/sdcreativ/cron-hostinger.env (CRON_SECRET, SITE_URL).
# Usage : sdcreativ-cron mail-sync   |   sdcreativ-cron quote-follow-ups invoice-payment-reminders …
set -uo pipefail
# shellcheck disable=SC1091
. /etc/sdcreativ/cron-hostinger.env
for job in "$@"; do
  body="$(curl -sS --max-time 180 -w ' [HTTP %{http_code}]' -H "Authorization: Bearer ${CRON_SECRET}" "${SITE_URL%/}/api/cron/${job}" 2>&1)"
  echo "[$(date -Is)] ${job}: ${body:0:400}"
done
