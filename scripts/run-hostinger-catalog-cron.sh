#!/usr/bin/env bash
# Relevé quotidien des prix Hostinger (appelé par cron). Secret lu dans /etc/sdcreativ/cron-hostinger.env.
# Installation (VPS, root) :
#   printf 'CRON_SECRET=%s\nSITE_URL=%s\n' "<secret>" "https://sdcreativ.com" > /etc/sdcreativ/cron-hostinger.env
#   chmod 600 /etc/sdcreativ/cron-hostinger.env
#   crontab -e  →  15 6 * * * /var/www/sdcreativ/scripts/run-hostinger-catalog-cron.sh >> /var/log/sdcreativ-hostinger.log 2>&1
set -euo pipefail
# shellcheck disable=SC1091
. /etc/sdcreativ/cron-hostinger.env
echo "[$(date -Is)] $(curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" "${SITE_URL%/}/api/cron/hostinger-catalog")"
