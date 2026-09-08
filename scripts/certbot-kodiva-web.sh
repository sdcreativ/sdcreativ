#!/usr/bin/env bash
# Certificat Let's Encrypt + vhost HTTPS pour ai.sdcreativ.com (console KODIVA).
# À lancer depuis la racine du dépôt CRM, sur le VPS :
#   ./scripts/certbot-kodiva-web.sh
#
# Prérequis : DNS A ai.sdcreativ.com → IP du VPS ; nginx prod déjà up.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod"
KODIVA_WEB_HOST="${KODIVA_WEB_HOST:-ai.sdcreativ.com}"

if [ ! -f .env ]; then
  echo "✗ .env manquant (CERTBOT_EMAIL)"
  exit 1
fi

CERTBOT_EMAIL="$(grep '^CERTBOT_EMAIL=' .env | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]')"
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

echo ">>> Vhost HTTPS"
export KODIVA_WEB_HOST
envsubst '${KODIVA_WEB_HOST}' < docker/nginx/conf.d/kodiva-web.conf.template > docker/nginx/conf.d/kodiva-web.conf

$COMPOSE exec nginx nginx -t
$COMPOSE exec nginx nginx -s reload

echo
echo "Terminé. Tester : curl -sSI https://${KODIVA_WEB_HOST}/login"
echo "502 = certificat OK, console KODIVA pas encore joignable (kodiva-web)."
