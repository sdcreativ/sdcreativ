#!/usr/bin/env bash
# Déploiement sur VPS Hostinger — voir docs/DEPLOIEMENT-VPS-HOSTINGER.md
set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ git pull"
git pull origin main

echo "→ npm ci"
npm ci

echo "→ npm run build"
npm run build

echo "→ pm2 restart"
pm2 restart sdcreativ || pm2 start ecosystem.config.cjs

echo "✓ Déploiement terminé — $(date -Iseconds)"
