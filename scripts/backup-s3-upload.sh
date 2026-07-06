#!/usr/bin/env bash
# Envoie les fichiers de sauvegarde locaux vers S3.
#
# Usage :
#   ./scripts/backup-s3-upload.sh backups/sdcreativ-20260630-030000.dump
#   ./scripts/backup-s3-upload.sh backups/sdcreativ-20260630-030000.dump backups/sdcreativ-uploads-20260630-030000.tar.gz

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
source "${ROOT_DIR}/scripts/backup-s3-common.sh"
backup_s3_load_env

if ! backup_s3_is_configured; then
  echo "✗ S3 non configuré — renseignez AWS_* dans .env.docker"
  exit 1
fi

if [ "$#" -lt 1 ]; then
  echo "Usage : $0 <fichier1> [fichier2 …]"
  exit 1
fi

echo "=== Upload sauvegardes → S3 ==="
echo "Bucket  : ${AWS_S3_BUCKET}"
echo "Prefix  : ${AWS_S3_BACKUP_PREFIX}/"
echo

MANIFEST_FILES=()
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
TIMESTAMP=""

for file in "$@"; do
  if [ ! -f "$file" ]; then
    echo "✗ Fichier introuvable : $file"
    exit 1
  fi
  backup_s3_upload_file "$file"
  MANIFEST_FILES+=("$(basename "$file")")
  if [ -z "$TIMESTAMP" ]; then
    TIMESTAMP="$(basename "$file" | grep -oE '[0-9]{8}-[0-9]{6}' | head -1 || date +%Y%m%d-%H%M%S)"
  fi
done

MANIFEST="${BACKUP_DIR}/sdcreativ-manifest-${TIMESTAMP}.json"
mkdir -p "$(dirname "$MANIFEST")"

{
  echo "{"
  echo "  \"createdAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
  echo "  \"timestamp\": \"${TIMESTAMP}\","
  echo "  \"files\": ["
  for i in "${!MANIFEST_FILES[@]}"; do
    comma=","
    [ "$i" -eq $((${#MANIFEST_FILES[@]} - 1)) ] && comma=""
    echo "    \"${MANIFEST_FILES[$i]}\"${comma}"
  done
  echo "  ]"
  echo "}"
} > "$MANIFEST"

backup_s3_write_manifest "$MANIFEST"
backup_s3_prune_old

echo
echo "=== Upload S3 terminé ==="
