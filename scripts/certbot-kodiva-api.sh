#!/usr/bin/env bash
# Certificat Let's Encrypt + vhost HTTPS pour api.ai.sdcreativ.com
# À lancer depuis la racine du dépôt CRM, sur le VPS :
#   ./scripts/certbot-kodiva-api.sh
#
# Prérequis : DNS A api.ai.sdcreativ.com → IP du VPS ; stack nginx prod déjà up.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod"
KODIVA_API_HOST="${KODIVA_API_HOST:-api.ai.sdcreativ.com}"

if [ ! -f .env ]; then
  echo "✗ .env manquant (DOMAIN, CERTBOT_EMAIL)"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [ -z "${CERTBOT_EMAIL:-}" ]; then
  echo "✗ CERTBOT_EMAIL manquant dans .env"
  exit 1
fi

echo ">>> Réseau Docker kodiva_proxy"
docker network create kodiva_proxy 2>/dev/null || true

echo ">>> Recrée nginx pour joindre kodiva_proxy (compose.prod.yml)"
$COMPOSE up -d nginx

echo ">>> Rechargement Nginx (challenge ACME HTTP)"
$COMPOSE exec nginx nginx -t
$COMPOSE exec nginx nginx -s reload

echo ">>> Certificat Let's Encrypt pour ${KODIVA_API_HOST}"
$COMPOSE run --rm --no-deps --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email ${CERTBOT_EMAIL} \
    --agree-tos --no-eff-email \
    --keep-until-expiring \
    -d ${KODIVA_API_HOST}" certbot

echo ">>> Vhost HTTPS"
export KODIVA_API_HOST
envsubst '${KODIVA_API_HOST}' < docker/nginx/conf.d/kodiva-api.conf.template > docker/nginx/conf.d/kodiva-api.conf

$COMPOSE exec nginx nginx -t
$COMPOSE exec nginx nginx -s reload

echo
echo "Terminé. Tester : curl -sS https://${KODIVA_API_HOST}/v1/health"
echo "502 = certificat OK, API KODIVA pas encore joignable (kodiva-api)."
