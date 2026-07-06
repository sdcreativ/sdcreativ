#!/usr/bin/env bash
# Restaure une sauvegarde PostgreSQL (.dump pg_restore).
#
# Usage :
#   chmod +x scripts/db-restore.sh
#   ./scripts/db-restore.sh backups/sdcreativ-20260630-030000.dump
#
# ATTENTION : écrase les données actuelles de la base cible.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

DUMP_FILE="${1:-}"

if [ -z "$DUMP_FILE" ] || [ ! -f "$DUMP_FILE" ]; then
  echo "Usage : $0 <fichier.dump>"
  echo "Ex.   : $0 backups/sdcreativ-20260630-030000.dump"
  exit 1
fi

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-sdcreativ}"
POSTGRES_DB="${POSTGRES_DB:-sdcreativ}"
COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yml}"

COMPOSE=(docker compose)
# shellcheck disable=SC2206
COMPOSE+=($COMPOSE_FILES)

echo "=== Restauration PostgreSQL — SD CREATIV ==="
echo "Fichier : ${DUMP_FILE}"
echo "Base    : ${POSTGRES_DB}"
echo
if [ "${BACKUP_CONFIRM:-}" != "yes" ]; then
  read -r -p "Confirmer la restauration (les données actuelles seront remplacées) ? [o/N] " confirm
  if [[ ! "$confirm" =~ ^[oOyY]$ ]]; then
    echo "Annulé."
    exit 0
  fi
fi

if ! "${COMPOSE[@]}" ps --status running postgres 2>/dev/null | grep -q postgres; then
  echo "✗ Conteneur postgres non démarré."
  exit 1
fi

echo ">>> Arrêt de l'app (évite les connexions actives)…"
"${COMPOSE[@]}" stop app 2>/dev/null || true

echo ">>> Restauration…"
cat "$DUMP_FILE" | "${COMPOSE[@]}" exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-acl

echo ">>> Redémarrage de l'app…"
"${COMPOSE[@]}" start app 2>/dev/null || "${COMPOSE[@]}" up -d app

echo
echo "✓ Restauration terminée."
