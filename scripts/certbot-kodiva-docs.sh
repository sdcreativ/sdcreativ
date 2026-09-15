#!/usr/bin/env bash
# Certificat Let's Encrypt + vhost HTTPS pour doc.kodiva.sdcreativ.com (docs KODIVA).
# À lancer depuis la racine du dépôt CRM, sur le VPS :
#   ./scripts/certbot-kodiva-docs.sh
#
# Prérequis :
#   DNS A/AAAA  doc.kodiva.sdcreativ.com  →  même IP que kodiva.sdcreativ.com
#   nginx prod déjà up ; image kodiva-web à jour avec les routes /docs

set -euo pipefail

echo ">>> certbot-kodiva-docs.sh (doc.kodiva.sdcreativ.com)"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod"
KODIVA_DOCS_HOST="${KODIVA_DOCS_HOST:-doc.kodiva.sdcreativ.com}"

if [ ! -f .env ]; then
  echo "✗ .env manquant (CERTBOT_EMAIL)"
  exit 1
fi

CERTBOT_EMAIL="$(grep '^CERTBOT_EMAIL=' .env | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]' || true)"
if [ -z "${CERTBOT_EMAIL}" ]; then
  echo "✗ CERTBOT_EMAIL manquant dans .env"
  exit 1
fi

echo ">>> Rechargement Nginx (challenge ACME HTTP)"
$COMPOSE exec nginx nginx -t
$COMPOSE exec nginx nginx -s reload

echo ">>> Certificat Let's Encrypt pour ${KODIVA_DOCS_HOST}"
$COMPOSE run --rm --no-deps --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email ${CERTBOT_EMAIL} \
    --agree-tos --no-eff-email \
    --keep-until-expiring \
    -d ${KODIVA_DOCS_HOST}" certbot

echo ">>> Vhost HTTPS (${KODIVA_DOCS_HOST})"
export KODIVA_DOCS_HOST
envsubst '${KODIVA_DOCS_HOST}' \
  < docker/nginx/conf.d/kodiva-docs.conf.template \
  > docker/nginx/conf.d/kodiva-docs.conf

$COMPOSE exec nginx nginx -t
$COMPOSE exec nginx nginx -s reload

echo
echo "Terminé. Tester :"
echo "  curl -sSI https://${KODIVA_DOCS_HOST}/"
echo "  curl -sSI https://${KODIVA_DOCS_HOST}/docs/widget"
echo "DNS manquant = challenge ACME en échec."
