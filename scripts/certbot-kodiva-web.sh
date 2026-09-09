#!/usr/bin/env bash
# Certificat Let's Encrypt + vhost HTTPS pour kodiva.sdcreativ.com (console KODIVA).
# ai.sdcreativ.com reste en redirection 301 (certificat déjà émis).
# À lancer depuis la racine du dépôt CRM, sur le VPS :
#   ./scripts/certbot-kodiva-web.sh
#
# Prérequis : DNS A kodiva.sdcreativ.com → IP du VPS ; nginx prod déjà up.

set -euo pipefail

echo ">>> certbot-kodiva-web.sh (kodiva.sdcreativ.com)"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod"
KODIVA_WEB_HOST="${KODIVA_WEB_HOST:-kodiva.sdcreativ.com}"
KODIVA_WEB_LEGACY_HOST="${KODIVA_WEB_LEGACY_HOST:-ai.sdcreativ.com}"

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

echo ">>> Certificat Let's Encrypt pour ${KODIVA_WEB_HOST}"
$COMPOSE run --rm --no-deps --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email ${CERTBOT_EMAIL} \
    --agree-tos --no-eff-email \
    --keep-until-expiring \
    -d ${KODIVA_WEB_HOST}" certbot

echo ">>> Vhost HTTPS (${KODIVA_WEB_HOST} + 301 ${KODIVA_WEB_LEGACY_HOST})"
export KODIVA_WEB_HOST KODIVA_WEB_LEGACY_HOST
envsubst '${KODIVA_WEB_HOST} ${KODIVA_WEB_LEGACY_HOST}' \
  < docker/nginx/conf.d/kodiva-web.conf.template \
  > docker/nginx/conf.d/kodiva-web.conf

$COMPOSE exec nginx nginx -t
$COMPOSE exec nginx nginx -s reload

echo
echo "Terminé. Tester :"
echo "  curl -sSI https://${KODIVA_WEB_HOST}/login"
echo "  curl -sSI https://${KODIVA_WEB_LEGACY_HOST}/login"
echo "502 = certificat OK, console KODIVA pas encore joignable (kodiva-web)."
