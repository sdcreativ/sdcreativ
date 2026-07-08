#!/usr/bin/env bash
# Vérifie la configuration email Resend sur le VPS (sans afficher la clé API).
#
# Usage :
#   ./scripts/check-email-config.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod)

env_val() {
  local file=$1 key=$2
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^["'\''"]//; s/["'\''"]$//'
}

echo "=== Vérification email — SD CREATIV ==="
echo

if [ ! -f .env.docker ]; then
  echo "✗ .env.docker introuvable"
  exit 1
fi

KEY="$(env_val .env.docker RESEND_API_KEY)"
FROM="$(env_val .env.docker CONTACT_FROM_EMAIL)"
TO="$(env_val .env.docker CONTACT_TO_EMAIL)"

if [ -n "${KEY:-}" ]; then
  echo "✓ RESEND_API_KEY définie (${#KEY} caractères, préfixe ${KEY:0:8}…)"
else
  echo "✗ RESEND_API_KEY absente — les emails échouent en production"
fi

if [ -n "${FROM:-}" ]; then
  echo "✓ CONTACT_FROM_EMAIL=${FROM}"
else
  echo "⚠ CONTACT_FROM_EMAIL vide (défaut contact@sdcreativ.com)"
fi

if [ -n "${TO:-}" ]; then
  echo "✓ CONTACT_TO_EMAIL=${TO}"
else
  echo "⚠ CONTACT_TO_EMAIL vide — vérifiez que vous recevez bien les notifications"
fi

echo
echo "→ Variables dans le conteneur app :"
if "${COMPOSE[@]}" ps --status running app 2>/dev/null | grep -q app; then
  APP_KEY="$("${COMPOSE[@]}" exec -T app printenv RESEND_API_KEY 2>/dev/null || true)"
  APP_FROM="$("${COMPOSE[@]}" exec -T app printenv CONTACT_FROM_EMAIL 2>/dev/null || true)"
  APP_TO="$("${COMPOSE[@]}" exec -T app printenv CONTACT_TO_EMAIL 2>/dev/null || true)"

  if [ -n "${APP_KEY:-}" ]; then
    echo "  ✓ RESEND_API_KEY chargée dans le conteneur"
  else
    echo "  ✗ RESEND_API_KEY absente du conteneur — redémarrez : ${COMPOSE[*]} up -d app"
  fi
  echo "  CONTACT_FROM_EMAIL=${APP_FROM:-<vide>}"
  echo "  CONTACT_TO_EMAIL=${APP_TO:-<vide>}"
else
  echo "  ✗ Conteneur app non démarré"
fi

echo
echo "→ DNS (domaine expéditeur) :"
DOMAIN="${FROM#*@}"
DOMAIN="${DOMAIN:-sdcreativ.com}"
SPF="$(dig +short TXT "$DOMAIN" 2>/dev/null | rg -i spf || true)"
if [ -n "$SPF" ]; then
  echo "  ✓ SPF : $SPF"
else
  echo "  ✗ SPF absent sur $DOMAIN — Resend → Domains → copier les enregistrements DNS"
fi

DKIM="$(dig +short TXT "resend._domainkey.$DOMAIN" 2>/dev/null || true)"
if [ -n "$DKIM" ]; then
  echo "  ✓ DKIM resend._domainkey présent"
else
  echo "  ✗ DKIM resend._domainkey absent — Resend → Domains → copier l'enregistrement"
fi

DMARC="$(dig +short TXT "_dmarc.$DOMAIN" 2>/dev/null || true)"
if [ -n "$DMARC" ]; then
  echo "  ✓ DMARC : $DMARC"
else
  echo "  ✗ DMARC absent (_dmarc) — ajoutez v=DMARC1; p=none; rua=mailto:contact@${DOMAIN}"
fi

echo
echo "→ Derniers logs Resend (app) :"
"${COMPOSE[@]}" logs app --tail 80 2>/dev/null | rg -i "email|resend" || echo "  (aucune ligne récente)"

echo
echo "Actions si échec :"
echo "  1. Resend → Domains → sdcreativ.com doit être Verified"
echo "  2. Ne pas supprimer SPF/DKIM en corrigeant les enregistrements A"
echo "  3. CONTACT_TO_EMAIL = une vraie boîte que vous consultez (Gmail, etc.)"
echo "  4. Redémarrer : ${COMPOSE[*]} up -d app"
