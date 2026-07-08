#!/usr/bin/env bash
# Déploiement routine sur le VPS (git pull + rebuild app + checks).
# Utilisé par le runner GitHub self-hosted et en manuel :
#   ./scripts/vps-deploy-pull.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod)

echo "=== Déploiement SD CREATIV — $(date -Iseconds) ==="
echo "→ Répertoire : $ROOT_DIR"
echo "→ Branche     : $(git branch --show-current 2>/dev/null || echo '?')"
echo

echo "→ git pull"
git pull --ff-only

echo "→ Rebuild & redémarrage app"
"${COMPOSE[@]}" up -d --build app

echo "→ Bootstrap admin CRM (si absent)"
./scripts/bootstrap-crm-admin.sh

echo "→ Post-déploiement"
./scripts/vps-post-deploy-check.sh

echo
echo "✓ Déploiement terminé — $(date -Iseconds)"
