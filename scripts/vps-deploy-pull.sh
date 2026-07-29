#!/usr/bin/env bash
# Déploiement routine sur le VPS (git pull + rebuild app + checks).
# Utilisé par le runner GitHub self-hosted et en manuel :
#   ./scripts/vps-deploy-pull.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_USER="${DEPLOY_USER:-deploy}"

# Toujours exécuter en deploy (le runner peut tourner sous un autre utilisateur).
if [ "$(id -un)" != "$DEPLOY_USER" ]; then
  echo "→ Re-exécution en ${DEPLOY_USER} (utilisateur courant : $(id -un))"
  exec sudo -n -u "$DEPLOY_USER" bash "$ROOT_DIR/scripts/vps-deploy-pull.sh" "$@"
fi

cd "$ROOT_DIR"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod)

echo "=== Déploiement SD CREATIV — $(date -Iseconds) ==="
echo "→ Répertoire : $ROOT_DIR"
echo "→ Branche     : $(git branch --show-current 2>/dev/null || echo '?')"
echo "→ Utilisateur : $(id -un)"
echo

if [ ! -w "$ROOT_DIR/.git/objects" ]; then
  echo "✗ Permissions insuffisantes sur $ROOT_DIR/.git/objects"
  echo "  Diagnostic : bash $ROOT_DIR/scripts/vps-deploy-diagnose.sh"
  echo "  Correction : sudo bash $ROOT_DIR/scripts/vps-fix-deploy-permissions.sh"
  exit 1
fi

echo "→ Préparation git"
if [ -z "${VPS_DEPLOY_REEXEC:-}" ]; then
  echo "→ git pull (avec stash auto si working tree sale)"
  DIRTY="$(git status --porcelain 2>/dev/null || true)"
  STASHED=0
  if [ -n "$DIRTY" ]; then
    echo "⚠ Modifications locales détectées — stash avant pull"
    git status --short || true
    if git stash push -u -m "vps-deploy-auto-$(date +%Y%m%d-%H%M%S)"; then
      STASHED=1
    else
      echo "✗ Impossible de stasher — résolvez manuellement (git status)"
      exit 1
    fi
  fi

  if ! git pull --ff-only; then
    if [ "$STASHED" -eq 1 ]; then
      echo "→ Restauration du stash après échec du pull"
      git stash pop || true
    fi
    exit 1
  fi

  if [ "$STASHED" -eq 1 ]; then
    echo "→ Stash local abandonné (versions dépôt prioritaires) : git stash drop"
    git stash drop || true
  fi
else
  echo "→ Re-exécution post-pull (script à jour)"
fi

chmod +x \
  scripts/run-db-backup.sh \
  scripts/db-backup.sh \
  scripts/backup-s3-upload.sh \
  scripts/infra-status-export.sh \
  scripts/install-backup-cron.sh \
  2>/dev/null || true

# Le pull peut mettre à jour ce script : re-exécuter pour charger la nouvelle version.
if [ -z "${VPS_DEPLOY_REEXEC:-}" ]; then
  export VPS_DEPLOY_REEXEC=1
  exec bash "$ROOT_DIR/scripts/vps-deploy-pull.sh" "$@"
fi

if [ -f .env.docker ]; then
  bash "$ROOT_DIR/scripts/validate-env-docker.sh" "$ROOT_DIR/.env.docker"
fi

if [ -f .env.docker ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/scripts/lib/load-env-file.sh"
  load_env_file "$ROOT_DIR/.env.docker"
  set +a
fi

if [ -f .env ]; then
  set -a
  load_env_file "$ROOT_DIR/.env"
  set +a
fi

# Migration légère : journal invitations calendrier (no-op si déjà présent)
if [ -f scripts/migrate-calendar-invitation-logs.sql ]; then
  echo "→ Migration calendar_invitation_logs (si besoin)"
  "${COMPOSE[@]}" exec -T postgres \
    psql -U "${POSTGRES_USER:-sdcreativ}" -d "${POSTGRES_DB:-sdcreativ}" \
    < scripts/migrate-calendar-invitation-logs.sql \
    >/dev/null 2>&1 || echo "⚠ Migration invitation-logs non appliquée (postgres indisponible ?)"
fi

# Migration légère : RSVP participants (phone + responded_at)
if [ -f scripts/migrate-calendar-rsvp.sql ]; then
  echo "→ Migration calendar RSVP (si besoin)"
  "${COMPOSE[@]}" exec -T postgres \
    psql -U "${POSTGRES_USER:-sdcreativ}" -d "${POSTGRES_DB:-sdcreativ}" \
    < scripts/migrate-calendar-rsvp.sql \
    >/dev/null 2>&1 || echo "⚠ Migration RSVP non appliquée (postgres indisponible ?)"
fi

DOMAIN="${DOMAIN:-sdcreativ.com}"
NGINX_CONF="docker/nginx/conf.d/sdcreativ.conf"
NGINX_TEMPLATE="docker/nginx/conf.d/sdcreativ.conf.template"

if [ -f "$NGINX_TEMPLATE" ]; then
  echo "→ Regénération config Nginx (HSTS, uploads…)"
  export DOMAIN
  envsubst '${DOMAIN}' < "$NGINX_TEMPLATE" > "$NGINX_CONF"
  if "${COMPOSE[@]}" ps --status running nginx 2>/dev/null | grep -q nginx; then
    "${COMPOSE[@]}" exec nginx nginx -s reload
    echo "✓ Nginx rechargé"
  fi
fi

echo "→ Rebuild & redémarrage app"
"${COMPOSE[@]}" up -d --build app

echo "→ Bootstrap admin CRM (si absent)"
./scripts/bootstrap-crm-admin.sh

echo "→ Post-déploiement"
./scripts/vps-post-deploy-check.sh

echo
echo "✓ Déploiement terminé — $(date -Iseconds)"
