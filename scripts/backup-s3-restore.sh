#!/usr/bin/env bash
# Télécharge une sauvegarde depuis S3 et restaure PostgreSQL (+ uploads optionnels).
#
# Usage :
#   ./scripts/backup-s3-restore.sh latest
#   ./scripts/backup-s3-restore.sh sdcreativ-20260630-030000.dump

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# shellcheck disable=SC1091
source "${ROOT_DIR}/scripts/backup-s3-common.sh"
backup_s3_load_env

TARGET="${1:-}"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yml}"

COMPOSE=(docker compose)
# shellcheck disable=SC2206
COMPOSE+=($COMPOSE_FILES)

if ! backup_s3_is_configured; then
  echo "✗ S3 non configuré"
  exit 1
fi

if [ -z "$TARGET" ]; then
  echo "Usage : $0 <latest|nom-du-fichier.dump>"
  exit 1
fi

if [ "$TARGET" = "latest" ]; then
  TARGET="$(backup_s3_list_dumps | head -1)"
  if [ -z "$TARGET" ]; then
    echo "✗ Aucun dump sur S3"
    exit 1
  fi
  echo ">>> Dernier dump S3 : ${TARGET}"
fi

if [[ "$TARGET" != *.dump ]]; then
  TARGET="${TARGET}.dump"
fi

TIMESTAMP="$(echo "$TARGET" | grep -oE '[0-9]{8}-[0-9]{6}' || true)"
UPLOADS_NAME="sdcreativ-uploads-${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "=== Restauration depuis S3 ==="
DUMP_LOCAL="$(backup_s3_download_file "$TARGET" "$BACKUP_DIR")"

if backup_s3_aws "" s3 ls "$(backup_s3_uri "$UPLOADS_NAME")" >/dev/null 2>&1; then
  UPLOADS_LOCAL="$(backup_s3_download_file "$UPLOADS_NAME" "$BACKUP_DIR")"
  echo "✓ Archive uploads téléchargée"
else
  UPLOADS_LOCAL=""
  echo "⚠ Pas d'archive uploads pour ce timestamp"
fi

echo ">>> Restauration PostgreSQL…"
BACKUP_CONFIRM=yes COMPOSE_FILES="$COMPOSE_FILES" "${ROOT_DIR}/scripts/db-restore.sh" "$DUMP_LOCAL"

if [ -n "$UPLOADS_LOCAL" ] && [ -f "$UPLOADS_LOCAL" ]; then
  echo ">>> Extraction uploads…"
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/scripts/backup-uploads-common.sh"
  backup_uploads_restore_archive "$UPLOADS_LOCAL"
fi

echo
echo "=== Restauration S3 terminée ==="
