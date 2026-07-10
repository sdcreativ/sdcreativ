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

echo "→ git pull"
git pull --ff-only

if [ -f .env.docker ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.docker
  set +a
fi

echo "→ Rebuild & redémarrage app"
"${COMPOSE[@]}" up -d --build app

echo "→ Bootstrap admin CRM (si absent)"
./scripts/bootstrap-crm-admin.sh

echo "→ Post-déploiement"
./scripts/vps-post-deploy-check.sh

echo
echo "✓ Déploiement terminé — $(date -Iseconds)"
