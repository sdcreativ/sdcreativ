#!/usr/bin/env bash
# Certificat Let's Encrypt + vhost HTTPS pour cdn.sdcreativ.com (widget KODIVA).
# À lancer depuis la racine du dépôt CRM, sur le VPS :
#   ./scripts/certbot-kodiva-cdn.sh
#
# Prérequis :
#   DNS CNAME  cdn.sdcreativ.com  →  kodiva.sdcreativ.com
#   nginx prod déjà up ; kodiva-web sert /kodiva/widget.js

set -euo pipefail

echo ">>> certbot-kodiva-cdn.sh (cdn.sdcreativ.com)"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod"
KODIVA_CDN_HOST="${KODIVA_CDN_HOST:-cdn.sdcreativ.com}"

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

echo ">>> Certificat Let's Encrypt pour ${KODIVA_CDN_HOST}"
$COMPOSE run --rm --no-deps --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email ${CERTBOT_EMAIL} \
    --agree-tos --no-eff-email \
    --keep-until-expiring \
    -d ${KODIVA_CDN_HOST}" certbot

echo ">>> Vhost HTTPS (${KODIVA_CDN_HOST})"
export KODIVA_CDN_HOST
envsubst '${KODIVA_CDN_HOST}' \
  < docker/nginx/conf.d/kodiva-cdn.conf.template \
  > docker/nginx/conf.d/kodiva-cdn.conf

$COMPOSE exec nginx nginx -t
$COMPOSE exec nginx nginx -s reload

echo
echo "Terminé. Tester :"
echo "  curl -sSI https://${KODIVA_CDN_HOST}/kodiva/widget.js"
echo "  curl -sSI https://${KODIVA_CDN_HOST}/widget.js"
echo "404 sur /kodiva/widget.js = image kodiva-web pas encore rebuildée avec le fichier."
