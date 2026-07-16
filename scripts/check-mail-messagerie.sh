#!/usr/bin/env bash
# Vérifie la config messagerie Hostinger (sans afficher les secrets).
#
# Usage :
#   ./scripts/check-mail-messagerie.sh
#   SITE_URL=https://sdcreativ.com ./scripts/check-mail-messagerie.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ROOT_DIR}/.env.docker"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod)

env_val() {
  local file=$1 key=$2
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^["'\'']//; s/["'\'']$//'
}

echo "=== Vérification Messagerie CRM (Hostinger) ==="
echo

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ .env.docker introuvable"
  exit 1
fi

SECRET="$(env_val "$ENV_FILE" MAIL_CREDENTIALS_SECRET)"
SYNC="$(env_val "$ENV_FILE" MAIL_SYNC_ENABLED)"
CRON="$(env_val "$ENV_FILE" CRON_SECRET)"
SITE_URL="${SITE_URL:-$(env_val "$ENV_FILE" NEXT_PUBLIC_SITE_URL)}"
SITE_URL="${SITE_URL%/}"

if [ -n "${SECRET:-}" ] && [ "${#SECRET}" -ge 32 ]; then
  echo "✓ MAIL_CREDENTIALS_SECRET défini (${#SECRET} caractères)"
else
  echo "✗ MAIL_CREDENTIALS_SECRET manquant ou < 32 caractères"
fi

if [ "${SYNC}" = "1" ] || [ "${SYNC}" = "true" ]; then
  echo "✓ MAIL_SYNC_ENABLED=1"
else
  echo "⚠ MAIL_SYNC_ENABLED off — sync manuelle uniquement (bouton Messagerie)"
fi

if [ -n "${CRON:-}" ]; then
  echo "✓ CRON_SECRET défini (${#CRON} caractères)"
else
  echo "✗ CRON_SECRET absent — cron mail-sync impossible"
fi

if crontab -l 2>/dev/null | grep -qF 'run-mail-sync-cron.sh'; then
  echo "✓ Cron mail-sync installé (utilisateur courant)"
elif [ "$(id -u)" -eq 0 ] && crontab -u deploy -l 2>/dev/null | grep -qF 'run-mail-sync-cron.sh'; then
  echo "✓ Cron mail-sync installé (deploy)"
else
  echo "⚠ Cron mail-sync absent — sudo ./scripts/install-mail-sync-cron.sh"
fi

echo
if [ -n "${SITE_URL:-}" ] && [ -n "${CRON:-}" ]; then
  echo "→ Test cron (dry) :"
  HTTP_CODE="$(curl -sS -o /tmp/sdcreativ-mail-sync.json -w '%{http_code}' \
    -H "Authorization: Bearer ${CRON}" \
    "${SITE_URL}/api/cron/mail-sync" || true)"
  echo "  HTTP ${HTTP_CODE} — réponse dans /tmp/sdcreativ-mail-sync.json"
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY' 2>/dev/null || true
import json
try:
  data=json.load(open("/tmp/sdcreativ-mail-sync.json"))
  # Ne jamais afficher de secrets éventuels
  keys=["enabled","mailboxes","inserted","errors","message"]
  print("  " + ", ".join(f"{k}={data.get(k)}" for k in keys if k in data))
except Exception as e:
  print("  (parse JSON impossible)", e)
PY
  fi
else
  echo "→ Skip test HTTP (SITE_URL ou CRON_SECRET manquant)"
fi

echo
echo "→ Conteneur app (variables, sans valeurs) :"
if "${COMPOSE[@]}" ps --status running app 2>/dev/null | grep -q app; then
  for key in MAIL_CREDENTIALS_SECRET MAIL_SYNC_ENABLED CRON_SECRET; do
    val="$("${COMPOSE[@]}" exec -T app printenv "$key" 2>/dev/null || true)"
    if [ -n "${val:-}" ]; then
      echo "  ✓ ${key} chargé dans le conteneur"
    else
      echo "  ✗ ${key} absent du conteneur — redémarrez app"
    fi
  done
else
  echo "  ⚠ Conteneur app non détecté (compose prod)"
fi

echo
echo "Checklist UI : /admin/crm/messagerie (bandeau Validation Phase 1)"
echo "API          : GET /api/admin/mail/validation (session admin, mail.read)"
echo "Doc          : docs/DOCKER-PRODUCTION.md § Cron messagerie"
