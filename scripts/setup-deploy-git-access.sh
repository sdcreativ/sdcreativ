#!/usr/bin/env bash
# Configure l'accès GitHub (git pull) pour l'utilisateur deploy sur le VPS.
# À exécuter une fois en tant que deploy :
#   ./scripts/setup-deploy-git-access.sh
#
set -euo pipefail

if [ "$(id -un)" != "deploy" ]; then
  echo "✗ Exécutez en tant que deploy : su - deploy"
  exit 1
fi

KEY="${HOME}/.ssh/id_ed25519_github"
REPO="${GITHUB_REPO:-sdcreativ/sdcreativ}"

mkdir -p "${HOME}/.ssh"
chmod 700 "${HOME}/.ssh"

if [ ! -f "$KEY" ]; then
  echo "→ Génération clé SSH dédiée GitHub…"
  ssh-keygen -t ed25519 -C "deploy-vps-sdcreativ" -f "$KEY" -N ""
fi

if [ ! -f "${HOME}/.ssh/config" ] || ! grep -q "Host github.com" "${HOME}/.ssh/config" 2>/dev/null; then
  cat >> "${HOME}/.ssh/config" << EOF

Host github.com
  HostName github.com
  User git
  IdentityFile ${KEY}
  IdentitiesOnly yes
EOF
  chmod 600 "${HOME}/.ssh/config"
fi

echo
echo "=== Clé publique à ajouter sur GitHub ==="
echo
cat "${KEY}.pub"
echo
echo "GitHub → https://github.com/${REPO}/settings/keys"
echo "  → Add deploy key"
echo "  → Title : sdcreativ-vps-deploy"
echo "  → Coller la clé ci-dessus"
echo "  → Allow write access : NON (lecture seule suffit)"
echo
read -r -p "Appuyez sur Entrée une fois la clé ajoutée sur GitHub…"

echo "→ Test connexion GitHub…"
ssh -T -o StrictHostKeyChecking=accept-new git@github.com || true

echo "→ Test git pull…"
cd /var/www/sdcreativ
git pull --ff-only

echo
echo "✓ Accès Git configuré pour deploy."
