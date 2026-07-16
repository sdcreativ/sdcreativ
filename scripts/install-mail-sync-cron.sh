#!/usr/bin/env bash
# Installe le cron de sync IMAP messagerie CRM (Hostinger).
#
# Prérequis :
#   - MAIL_CREDENTIALS_SECRET + boîte contact@ configurée
#   - MAIL_SYNC_ENABLED=1 dans .env.docker
#   - CRON_SECRET défini
#   - App joignable en HTTPS
#
# Usage (VPS) :
#   chmod +x scripts/install-mail-sync-cron.sh
#   sudo SITE_URL=https://sdcreativ.com ./scripts/install-mail-sync-cron.sh
#
# Variables :
#   SITE_URL=https://sdcreativ.com
#   CRON_USER=deploy
#   MAIL_SYNC_INTERVAL="*/5"   # crontab minute field

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CRON_USER="${CRON_USER:-$(whoami)}"
MAIL_SYNC_INTERVAL="${MAIL_SYNC_INTERVAL:-*/5}"
LOG_FILE="/var/log/sdcreativ-mail-sync.log"
ENV_FILE="${ROOT_DIR}/.env.docker"

if [ "$(id -u)" -ne 0 ]; then
  echo "Exécutez avec sudo pour installer le cron système."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ ${ENV_FILE} introuvable"
  exit 1
fi

env_val() {
  local key=$1
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^["'\'']//; s/["'\'']$//'
}

CRON_SECRET="$(env_val CRON_SECRET)"
SYNC_ENABLED="$(env_val MAIL_SYNC_ENABLED)"
SITE_URL="${SITE_URL:-$(env_val NEXT_PUBLIC_SITE_URL)}"
SITE_URL="${SITE_URL%/}"

if [ -z "${CRON_SECRET:-}" ]; then
  echo "✗ CRON_SECRET absent de .env.docker"
  exit 1
fi

if [ -z "${SITE_URL:-}" ]; then
  echo "✗ SITE_URL / NEXT_PUBLIC_SITE_URL manquant — ex. SITE_URL=https://sdcreativ.com"
  exit 1
fi

if [ "${SYNC_ENABLED}" != "1" ] && [ "${SYNC_ENABLED}" != "true" ]; then
  echo "⚠ MAIL_SYNC_ENABLED n’est pas à 1 — le cron tournera mais l’API répondra « sync ignorée »."
  echo "  Activez MAIL_SYNC_ENABLED=1 puis redémarrez le conteneur app."
fi

touch "$LOG_FILE"
chown "$CRON_USER:$CRON_USER" "$LOG_FILE" 2>/dev/null || true

# Secret injecté via fichier temporaire lu par le job (évite de le coller en clair dans crontab -l public).
SECRET_FILE="/etc/sdcreativ/cron-mail-sync.env"
mkdir -p /etc/sdcreativ
umask 077
printf 'CRON_SECRET=%s\nSITE_URL=%s\n' "$CRON_SECRET" "$SITE_URL" > "$SECRET_FILE"
chmod 600 "$SECRET_FILE"
chown root:root "$SECRET_FILE"

WRAPPER="${ROOT_DIR}/scripts/run-mail-sync-cron.sh"
chmod +x "$WRAPPER" 2>/dev/null || true

MAIL_CRON="${MAIL_SYNC_INTERVAL} * * * * ${WRAPPER} >> ${LOG_FILE} 2>&1"

CURRENT="$(crontab -u "$CRON_USER" -l 2>/dev/null || true)"
NEXT="$CURRENT"

if ! echo "$CURRENT" | grep -qF 'run-mail-sync-cron.sh'; then
  NEXT="${NEXT}
${MAIL_CRON}"
  echo "✓ Cron mail-sync ajouté (${MAIL_SYNC_INTERVAL})"
else
  echo "✓ Cron mail-sync déjà présent"
fi

if [ "$NEXT" != "$CURRENT" ]; then
  printf '%s\n' "$NEXT" | sed '/^$/d' | crontab -u "$CRON_USER" -
fi

echo
echo "Endpoint : ${SITE_URL}/api/cron/mail-sync"
echo "Log      : ${LOG_FILE}"
echo "Secret   : ${SECRET_FILE} (chmod 600)"
echo
echo "Test manuel :"
echo "  sudo -u ${CRON_USER} ${WRAPPER}"
echo "  ./scripts/check-mail-messagerie.sh"
