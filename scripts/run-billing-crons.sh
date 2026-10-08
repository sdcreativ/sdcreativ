#!/usr/bin/env bash
# Tâches quotidiennes de facturation (appelées par cron) : factures récurrentes en brouillon (avec
# avantages promis appliqués), puis rappels et alertes des avantages. Secret : /etc/sdcreativ/cron-hostinger.env
# Installation (VPS, root) :
#   crontab -e  →  30 6 * * * /var/www/sdcreativ/scripts/run-billing-crons.sh >> /var/log/sdcreativ-billing.log 2>&1
set -euo pipefail
# shellcheck disable=SC1091
. /etc/sdcreativ/cron-hostinger.env
for job in subscription-billing client-benefits; do
  echo "[$(date -Is)] ${job}: $(curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" "${SITE_URL%/}/api/cron/${job}")"
done
