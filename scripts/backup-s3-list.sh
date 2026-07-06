#!/usr/bin/env bash
# Liste les sauvegardes PostgreSQL disponibles sur S3.
#
# Usage : ./scripts/backup-s3-list.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
source "${ROOT_DIR}/scripts/backup-s3-common.sh"
backup_s3_load_env

if ! backup_s3_is_configured; then
  echo "✗ S3 non configuré"
  exit 1
fi

echo "=== Sauvegardes S3 — ${AWS_S3_BUCKET}/${AWS_S3_BACKUP_PREFIX}/ ==="
echo

backup_s3_aws "" s3 ls "$(backup_s3_uri "")" --recursive --human-readable --summarize \
  | grep -E '\.(dump|tar\.gz|json)$' || echo "(aucun fichier)"

echo
echo "Dumps PostgreSQL (.dump) :"
backup_s3_list_dumps | head -20
