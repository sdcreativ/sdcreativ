#!/usr/bin/env bash
# Crée le compte admin CRM en base si absent (VPS / prod).
# Le compte est aussi créé automatiquement au démarrage de l'app (ensureSchema).
#
# Usage :
#   ./scripts/bootstrap-crm-admin.sh
#   COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml" ./scripts/bootstrap-crm-admin.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yml -f docker-compose.prod.yml}"
COMPOSE=(docker compose "${COMPOSE_FILES[@]}" --profile prod)

env_val() {
  local file=$1 key=$2
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^["'\''"]//; s/["'\''"]$//'
}

echo "=== Bootstrap compte admin CRM ==="

if [ ! -f .env.docker ]; then
  echo "✗ .env.docker introuvable"
  exit 1
fi

ADMIN_SECRET="$(env_val .env.docker ADMIN_SECRET)"
BOOTSTRAP_EMAIL="$(env_val .env.docker CRM_BOOTSTRAP_EMAIL)"
BOOTSTRAP_EMAIL="${BOOTSTRAP_EMAIL:-admin@sdcreativ.com}"

if [ -z "${ADMIN_SECRET:-}" ]; then
  echo "✗ ADMIN_SECRET manquant dans .env.docker"
  exit 1
fi

echo "→ Réparation schéma CRM (si nécessaire)…"
"${COMPOSE[@]}" exec -T postgres psql -U sdcreativ -d sdcreativ -v ON_ERROR_STOP=1 \
  < scripts/db-repair-crm-schema.sql >/dev/null

COUNT="$("${COMPOSE[@]}" exec -T postgres psql -U sdcreativ -d sdcreativ -tAc "SELECT COUNT(*) FROM crm_users;" | tr -d '[:space:]')"
echo "→ Utilisateurs CRM en base : ${COUNT:-0}"

if [ "${COUNT:-0}" != "0" ]; then
  echo "✓ Compte(s) déjà présent(s) :"
  "${COMPOSE[@]}" exec -T postgres psql -U sdcreativ -d sdcreativ -c \
    "SELECT email, name, role, active, must_change_password FROM crm_users ORDER BY created_at;"
  exit 0
fi

echo "→ Redémarrage app (initialisation schéma + bootstrap)…"
"${COMPOSE[@]}" up -d app
sleep 5

# Déclenche ensureSchema via une requête HTTP
"${COMPOSE[@]}" exec -T app wget -qO- http://127.0.0.1:3000/admin/login >/dev/null 2>&1 || true

COUNT="$("${COMPOSE[@]}" exec -T postgres psql -U sdcreativ -d sdcreativ -tAc "SELECT COUNT(*) FROM crm_users;" | tr -d '[:space:]')"

if [ "${COUNT:-0}" = "0" ]; then
  echo "→ Tentative via API login…"
  HTTP_CODE="$(curl -s -o /tmp/sdcreativ-bootstrap-login.json -w "%{http_code}" \
    -X POST "https://${DOMAIN:-sdcreativ.com}/api/admin/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${BOOTSTRAP_EMAIL}\",\"password\":\"${ADMIN_SECRET}\"}" || echo "000")"

  if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Compte créé via login API (HTTP 200)"
  else
    echo "✗ Échec login API (HTTP ${HTTP_CODE})"
    cat /tmp/sdcreativ-bootstrap-login.json 2>/dev/null || true
    echo
    echo "Vérifiez : ADMIN_SECRET, CRM_BOOTSTRAP_EMAIL, logs app :"
    echo "  ${COMPOSE[*]} logs app --tail 50"
    exit 1
  fi
else
  echo "✓ Compte admin créé au démarrage"
fi

"${COMPOSE[@]}" exec -T postgres psql -U sdcreativ -d sdcreativ -c \
  "SELECT email, name, role, active, must_change_password FROM crm_users ORDER BY created_at;"

echo
echo "Connectez-vous sur /admin/login avec :"
echo "  Email    : ${BOOTSTRAP_EMAIL}"
echo "  Mot de passe : ADMIN_SECRET (.env.docker)"
echo "Puis définissez votre mot de passe personnel sur /admin/compte"
