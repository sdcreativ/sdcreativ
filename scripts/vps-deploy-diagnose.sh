#!/usr/bin/env bash
# Diagnostic permissions déploiement (git pull + runner GitHub).
# Usage sur le VPS :
#   bash /var/www/sdcreativ/scripts/vps-deploy-diagnose.sh
#
set -euo pipefail

REPO="${1:-/var/www/sdcreativ}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"

echo "=== Diagnostic déploiement — $(date -Iseconds) ==="
echo "→ Dépôt : $REPO"
echo

echo "── Utilisateur courant"
id
echo

echo "── Service runner GitHub (systemd)"
RUNNER_UNIT="$(systemctl list-units --type=service --all 2>/dev/null | grep -oE 'actions\.runner\.[^ ]+\.service' | head -1 || true)"
if [ -n "$RUNNER_UNIT" ]; then
  systemctl show "$RUNNER_UNIT" -p User -p Group -p ActiveState --no-pager
else
  echo "(service actions.runner.* introuvable)"
fi
echo

echo "── Propriété .git/objects"
if [ -d "$REPO/.git/objects" ]; then
  ls -ld "$REPO/.git/objects"
  ls -ld "$REPO/.git" "$REPO"
  WRONG_OWNER="$(find "$REPO/.git/objects" ! -user "$DEPLOY_USER" 2>/dev/null | head -5 || true)"
  if [ -n "$WRONG_OWNER" ]; then
    echo "✗ Fichiers .git/objects PAS owned by $DEPLOY_USER (extrait) :"
    echo "$WRONG_OWNER"
  else
    echo "✓ Tous les fichiers .git/objects appartiennent à $DEPLOY_USER"
  fi
else
  echo "✗ $REPO/.git/objects introuvable"
fi
echo

echo "── Test écriture .git/objects"
TEST_FILE="$REPO/.git/objects/.deploy-write-test-$$"
for USER in "$(id -un)" "$DEPLOY_USER"; do
  if id "$USER" &>/dev/null; then
    if sudo -u "$USER" test -w "$REPO/.git/objects" 2>/dev/null; then
      if sudo -u "$USER" touch "$TEST_FILE" 2>/dev/null; then
        echo "✓ $USER peut écrire dans .git/objects"
        sudo -u "$USER" rm -f "$TEST_FILE"
      else
        echo "✗ $USER : répertoire writable mais touch échoue (quota/disque ?)"
      fi
    else
      echo "✗ $USER ne peut PAS écrire dans .git/objects"
    fi
  fi
done
echo

echo "── Espace disque"
df -h "$REPO" | tail -1
echo

echo "── git pull test (utilisateur $DEPLOY_USER)"
if id "$DEPLOY_USER" &>/dev/null; then
  sudo -u "$DEPLOY_USER" bash -lc "cd '$REPO' && git pull --ff-only" && echo "✓ git pull OK" || echo "✗ git pull échoué"
else
  echo "✗ Utilisateur $DEPLOY_USER introuvable"
fi
