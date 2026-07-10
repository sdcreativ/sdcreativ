#!/usr/bin/env bash
# Déploiement production complète : build app + SSL Let's Encrypt + Nginx + Certbot.
# À exécuter sur le VPS une fois le DNS pointé vers le serveur.
#
# Usage :
#   chmod +x scripts/docker-prod-deploy.sh scripts/docker-preflight.sh
#   ./scripts/docker-preflight.sh
#   ./scripts/docker-prod-deploy.sh
#
# Premier test sans quota Let's Encrypt :
#   CERTBOT_STAGING=1 ./scripts/docker-prod-deploy.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod"

echo "=== Déploiement production Docker — SD CREATIV ==="
echo

# --- Pré-vol ---
if [ -x scripts/docker-preflight.sh ]; then
  scripts/docker-preflight.sh || {
    echo
    echo "Corrigez les erreurs ci-dessus avant de continuer."
    exit 1
  }
else
  echo "⚠ scripts/docker-preflight.sh introuvable — poursuite sans pré-vol"
fi

echo

set -a
# shellcheck disable=SC1091
source .env
set +a

DOMAIN="${DOMAIN:-sdcreativ.com}"
STAGING="${CERTBOT_STAGING:-0}"

# --- Aligner NEXT_PUBLIC_SITE_URL sur le domaine prod ---
if [ -f .env.docker ]; then
  target_url="https://${DOMAIN}"
  if grep -q '^NEXT_PUBLIC_SITE_URL=' .env.docker; then
    if [[ "$(grep '^NEXT_PUBLIC_SITE_URL=' .env.docker | cut -d= -f2-)" != "$target_url" ]]; then
      echo ">>> Mise à jour NEXT_PUBLIC_SITE_URL → $target_url dans .env.docker"
      if [[ "$(uname)" == "Darwin" ]]; then
        sed -i '' "s|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=${target_url}|" .env.docker
      else
        sed -i "s|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=${target_url}|" .env.docker
      fi
    fi
  fi
fi

# --- Build : variables publiques (.env.docker) ---
load_env_docker_for_build() {
  if [ -f .env.docker ]; then
    set -a
    # shellcheck disable=SC1091
    source .env.docker
    set +a
  fi
}

# --- Build image app ---
echo ">>> Build de l'image Next.js…"
load_env_docker_for_build
$COMPOSE build app

# --- SSL + Nginx (init ou renouvellement config) ---
CONF="docker/nginx/conf.d/sdcreativ.conf"
if [ ! -f "$CONF" ]; then
  echo ">>> Première installation : certificats SSL + Nginx…"
  chmod +x docker/certbot/init-letsencrypt.sh
  ./docker/certbot/init-letsencrypt.sh
else
  echo ">>> Config Nginx déjà présente — regénération depuis le template…"
  export DOMAIN
  envsubst '${DOMAIN}' < docker/nginx/conf.d/sdcreativ.conf.template > "$CONF"
  echo ">>> Démarrage stack prod…"
  $COMPOSE up -d
  echo ">>> Rechargement Nginx…"
  $COMPOSE exec nginx nginx -s reload
fi

echo
echo ">>> État des services :"
$COMPOSE ps

echo
echo "=== Déploiement terminé ==="
if [ "$STAGING" = "1" ]; then
  echo "Mode staging Let's Encrypt — certificats NON reconnus par les navigateurs."
fi
echo "Site : https://${DOMAIN}"
echo
echo "Vérifications :"
echo "  curl -I https://${DOMAIN}"
echo "  $COMPOSE logs -f nginx app"
echo "  $COMPOSE ps"
