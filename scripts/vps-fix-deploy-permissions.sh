#!/usr/bin/env bash
# Corrige les permissions du dépôt pour le runner self-hosted (utilisateur deploy).
# À exécuter une fois sur le VPS en root :
#   sudo bash /var/www/sdcreativ/scripts/vps-fix-deploy-permissions.sh
#
set -euo pipefail

REPO="${1:-/var/www/sdcreativ}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"

if [ "$(id -u)" -ne 0 ]; then
  echo "✗ Exécutez en root : sudo bash $0"
  exit 1
fi

if ! id "$DEPLOY_USER" &>/dev/null; then
  echo "✗ Utilisateur introuvable : $DEPLOY_USER"
  exit 1
fi

if [ ! -d "$REPO/.git" ]; then
  echo "✗ Dépôt Git introuvable : $REPO"
  exit 1
fi

echo "→ chown -R ${DEPLOY_USER}:${DEPLOY_USER} ${REPO}"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$REPO"

echo "→ chmod u+rwX sur .git"
find "$REPO/.git" -type d -exec chmod u+rwx {} +
find "$REPO/.git" -type f -exec chmod u+rw {} +

echo "→ Sudoers : autoriser le déploiement en ${DEPLOY_USER}"
SUDOERS_FILE="/etc/sudoers.d/sdcreativ-deploy"
RUNNER_USER=""
RUNNER_UNIT="$(systemctl list-units --type=service --all 2>/dev/null | grep -oE 'actions\.runner\.[^ ]+\.service' | head -1 || true)"
if [ -n "$RUNNER_UNIT" ]; then
  RUNNER_USER="$(systemctl show "$RUNNER_UNIT" -p User --value 2>/dev/null || true)"
fi

{
  echo "# SD CREATIV — déploiement GitHub Actions self-hosted"
  echo "root ALL=(${DEPLOY_USER}) NOPASSWD: /bin/bash ${REPO}/scripts/vps-deploy-pull.sh"
  echo "${DEPLOY_USER} ALL=(${DEPLOY_USER}) NOPASSWD: /bin/bash ${REPO}/scripts/vps-deploy-pull.sh"
  if [ -n "$RUNNER_USER" ] && [ "$RUNNER_USER" != "$DEPLOY_USER" ] && [ "$RUNNER_USER" != "root" ]; then
    echo "${RUNNER_USER} ALL=(${DEPLOY_USER}) NOPASSWD: /bin/bash ${REPO}/scripts/vps-deploy-pull.sh"
  fi
} > "$SUDOERS_FILE"
chmod 440 "$SUDOERS_FILE"
visudo -cf "$SUDOERS_FILE"

echo "→ Test git pull (en ${DEPLOY_USER})…"
sudo -u "$DEPLOY_USER" bash -lc "cd '$REPO' && git pull --ff-only"

echo
echo "✓ Permissions corrigées."
echo "  Relancez le workflow Deploy, ou testez :"
echo "  sudo -u ${DEPLOY_USER} bash ${REPO}/scripts/vps-deploy-pull.sh"
