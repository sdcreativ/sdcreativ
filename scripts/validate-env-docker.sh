#!/usr/bin/env bash
# Vérifie la syntaxe de .env.docker avant déploiement.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FILE="${1:-$ROOT_DIR/.env.docker}"

if [ ! -f "$FILE" ]; then
  echo "✗ Fichier introuvable : $FILE"
  exit 1
fi

echo "→ Validation de $FILE"
errors=0
line_no=0

while IFS= read -r line || [ -n "$line" ]; do
  line_no=$((line_no + 1))
  line="${line%$'\r'}"
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line//[[:space:]]/}" ]] && continue

  if [[ ! "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
    echo "✗ Ligne $line_no : format invalide (attendu KEY=VALUE)"
    echo "  $line"
    errors=$((errors + 1))
  fi
done < "$FILE"

if [ "$errors" -gt 0 ]; then
  echo
  echo "✗ $errors ligne(s) invalide(s). Corrigez $FILE puis relancez le déploiement."
  echo "  Astuce : valeurs avec espaces → guillemets, ex. CONTACT_FROM_NAME=\"SD CREATIV\""
  exit 1
fi

echo "✓ $FILE OK ($line_no lignes)"
