#!/usr/bin/env bash
# Installe un GitHub Actions self-hosted runner sur le VPS (utilisateur deploy).
# Contourne le blocage SSH entrant depuis les runners GitHub cloud (Hostinger).
#
# Prérequis :
#   - Utilisateur deploy avec groupe docker et accès à /var/www/sdcreativ
#   - Token d'enregistrement GitHub (usage unique, expire après ~1 h)
#
# Obtenir le token :
#   GitHub → repo sdcreativ/sdcreativ → Settings → Actions → Runners
#   → New self-hosted runner → Linux → copier le token
#
# Usage (sur le VPS, en deploy) :
#   cd /var/www/sdcreativ
#   chmod +x scripts/install-github-runner.sh
#   GITHUB_RUNNER_TOKEN=VOTRE_TOKEN ./scripts/install-github-runner.sh
#
set -euo pipefail

if [ "$(id -un)" != "deploy" ]; then
  echo "✗ Exécutez ce script en tant qu'utilisateur deploy (pas root)."
  echo "  su - deploy"
  exit 1
fi

if [ -z "${GITHUB_RUNNER_TOKEN:-}" ]; then
  echo "✗ Variable GITHUB_RUNNER_TOKEN requise."
  echo "  GitHub → Settings → Actions → Runners → New self-hosted runner"
  exit 1
fi

REPO_URL="${GITHUB_REPO_URL:-https://github.com/sdcreativ/sdcreativ}"
RUNNER_NAME="${GITHUB_RUNNER_NAME:-sdcreativ-vps}"
RUNNER_LABELS="${GITHUB_RUNNER_LABELS:-sdcreativ-vps,linux,production}"
INSTALL_DIR="${HOME}/actions-runner"

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

if [ ! -f ./config.sh ]; then
  echo "→ Téléchargement du runner GitHub Actions…"
  RUNNER_VERSION="$(
    curl -fsSL https://api.github.com/repos/actions/runner/releases/latest \
      | grep -oE '"tag_name": "v[0-9.]+"' | head -1 | cut -d'"' -f4 | sed 's/^v//'
  )"
  ARCH="x64"
  curl -fsSL -o "actions-runner-linux-${ARCH}-${RUNNER_VERSION}.tar.gz" \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-${ARCH}-${RUNNER_VERSION}.tar.gz"
  tar xzf "actions-runner-linux-${ARCH}-${RUNNER_VERSION}.tar.gz"
  rm -f "actions-runner-linux-${ARCH}-${RUNNER_VERSION}.tar.gz"
fi

echo "→ Configuration du runner (${RUNNER_NAME})…"
./config.sh \
  --url "$REPO_URL" \
  --token "$GITHUB_RUNNER_TOKEN" \
  --name "$RUNNER_NAME" \
  --labels "$RUNNER_LABELS" \
  --work _work \
  --unattended \
  --replace

echo "→ Installation du service systemd…"
sudo ./svc.sh install deploy
sudo ./svc.sh start

echo
echo "✓ Runner installé et démarré."
echo "  Vérifier : GitHub → Settings → Actions → Runners (statut Idle)"
echo "  Logs     : journalctl -u actions.runner.* -f"
