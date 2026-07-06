#!/usr/bin/env bash
# Initialise Let's Encrypt pour la stack Docker (première exécution).
# Usage : depuis la racine du projet, après ./scripts/docker-preflight.sh
#   chmod +x docker/certbot/init-letsencrypt.sh
#   ./docker/certbot/init-letsencrypt.sh
#
# Test sans quota Let's Encrypt : CERTBOT_STAGING=1 ./docker/certbot/init-letsencrypt.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod"

if [ ! -f .env ]; then
  echo "Créez .env (DOMAIN, CERTBOT_EMAIL, POSTGRES_*…) — voir docs/DOCKER-PRODUCTION.md"
  exit 1
fi

if [ ! -f .env.docker ]; then
  echo "Créez .env.docker à partir de .env.docker.example"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

DOMAIN="${DOMAIN:-sdcreativ.com}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
STAGING="${CERTBOT_STAGING:-0}"

if [ -z "$CERTBOT_EMAIL" ]; then
  echo "Définissez CERTBOT_EMAIL dans .env"
  exit 1
fi

CONF_DIR="docker/nginx/conf.d"
TEMPLATE="$CONF_DIR/sdcreativ.conf.template"
OUTPUT="$CONF_DIR/sdcreativ.conf"

mkdir -p "$CONF_DIR"
export DOMAIN
envsubst '${DOMAIN}' < "$TEMPLATE" > "$OUTPUT"
echo ">>> Config Nginx générée : $OUTPUT"

staging_arg=""
if [ "$STAGING" = "1" ]; then
  staging_arg="--staging"
  echo "Mode staging Let's Encrypt activé"
fi

echo ">>> Démarrage PostgreSQL, Redis et app…"
docker compose up -d postgres redis
docker compose -f docker-compose.yml -f docker-compose.prod.yml build app
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d app

echo ">>> Attente santé app…"
for i in $(seq 1 30); do
  if docker compose -f docker-compose.yml -f docker-compose.prod.yml ps app 2>/dev/null | grep -q "(healthy)"; then
    break
  fi
  sleep 2
done

echo ">>> Préparation certificats dummy…"
$COMPOSE run --rm --entrypoint "\
  mkdir -p /etc/letsencrypt/live/${DOMAIN} && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/${DOMAIN}/privkey.pem \
    -out /etc/letsencrypt/live/${DOMAIN}/fullchain.pem \
    -subj /CN=${DOMAIN}" certbot

echo ">>> Démarrage Nginx…"
$COMPOSE up -d nginx

echo ">>> Attente santé Nginx…"
for i in $(seq 1 20); do
  if $COMPOSE ps nginx 2>/dev/null | grep -q "(healthy)"; then
    break
  fi
  sleep 2
done

echo ">>> Suppression certificat dummy…"
$COMPOSE run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/${DOMAIN} && \
  rm -Rf /etc/letsencrypt/archive/${DOMAIN} && \
  rm -f /etc/letsencrypt/renewal/${DOMAIN}.conf" certbot

echo ">>> Obtention certificat Let's Encrypt pour ${DOMAIN} et www.${DOMAIN}…"
echo "    (le DNS doit pointer vers ce serveur)"
$COMPOSE run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    ${staging_arg} \
    --email ${CERTBOT_EMAIL} \
    --agree-tos --no-eff-email \
    -d ${DOMAIN} -d www.${DOMAIN}" certbot

echo ">>> Rechargement Nginx avec certificats réels…"
$COMPOSE exec nginx nginx -s reload

echo ">>> Démarrage renouvellement automatique Certbot…"
$COMPOSE up -d certbot

echo
echo "Terminé. Site : https://${DOMAIN}"
echo "Poursuivre avec : docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod ps"
