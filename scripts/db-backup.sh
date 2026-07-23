#!/usr/bin/env bash
# Sauvegarde PostgreSQL (format custom pg_dump) + uploads (hôte ou volume Docker).
#
# Usage :
#   chmod +x scripts/db-backup.sh
#   ./scripts/db-backup.sh
#
# Variables optionnelles :
#   BACKUP_DIR=/var/backups/sdcreativ  RETENTION_DAYS=14  ./scripts/db-backup.sh
#   COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"  (VPS prod)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Compose / Postgres : .env (hôte). AWS S3 : uniquement via backup_s3_load_env (.env.docker).
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-sdcreativ}"
POSTGRES_DB="${POSTGRES_DB:-sdcreativ}"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yml}"

mkdir -p "$BACKUP_DIR"

COMPOSE=(docker compose)
# shellcheck disable=SC2206
COMPOSE+=($COMPOSE_FILES)

if ! "${COMPOSE[@]}" ps --status running postgres 2>/dev/null | grep -q postgres; then
  echo "✗ Conteneur postgres non démarré. Lancez : ${COMPOSE[*]} up -d postgres"
  exit 1
fi

DUMP_FILE="${BACKUP_DIR}/sdcreativ-${TIMESTAMP}.dump"
UPLOADS_ARCHIVE=""
S3_UPLOAD_FILES=()

echo "=== Sauvegarde PostgreSQL — SD CREATIV ==="
echo "Base    : ${POSTGRES_DB}"
echo "Fichier : ${DUMP_FILE}"
echo

"${COMPOSE[@]}" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl \
  > "$DUMP_FILE"

if [ ! -s "$DUMP_FILE" ]; then
  echo "✗ Dump vide ou échec pg_dump"
  rm -f "$DUMP_FILE"
  exit 1
fi

SIZE="$(du -h "$DUMP_FILE" | cut -f1)"
echo "✓ Dump PostgreSQL créé (${SIZE})"
S3_UPLOAD_FILES+=("$DUMP_FILE")

if [ -f scripts/backup-uploads-common.sh ]; then
  # shellcheck disable=SC1091
  source scripts/backup-uploads-common.sh
  if UPLOADS_ARCHIVE="$(backup_uploads_create_archive "$BACKUP_DIR" "$TIMESTAMP")"; then
    UPLOADS_SIZE="$(du -h "$UPLOADS_ARCHIVE" | cut -f1)"
    echo "✓ Archive uploads (${UPLOADS_SIZE}) : ${UPLOADS_ARCHIVE}"
    S3_UPLOAD_FILES+=("$UPLOADS_ARCHIVE")
  fi
elif [ -d public/uploads ] && [ "$(ls -A public/uploads 2>/dev/null)" ]; then
  UPLOADS_ARCHIVE="${BACKUP_DIR}/sdcreativ-uploads-${TIMESTAMP}.tar.gz"
  tar -czf "$UPLOADS_ARCHIVE" -C public uploads
  UPLOADS_SIZE="$(du -h "$UPLOADS_ARCHIVE" | cut -f1)"
  echo "✓ Archive uploads (${UPLOADS_SIZE}) : ${UPLOADS_ARCHIVE}"
  S3_UPLOAD_FILES+=("$UPLOADS_ARCHIVE")
fi

# Rotation : supprimer les dumps plus vieux que RETENTION_DAYS
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'sdcreativ-*.dump' -o -name 'sdcreativ-uploads-*.tar.gz' \) \
  -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

REMAINING="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'sdcreativ-*.dump' | wc -l | tr -d ' ')"

# --- Upload S3 (si configuré dans .env.docker) ---
if [ -f scripts/backup-s3-common.sh ]; then
  # shellcheck disable=SC1091
  source scripts/backup-s3-common.sh
  backup_s3_load_env
  if backup_s3_is_configured && [ "${#S3_UPLOAD_FILES[@]}" -gt 0 ]; then
    echo
    echo ">>> Envoi vers S3…"
    "${ROOT_DIR}/scripts/backup-s3-upload.sh" "${S3_UPLOAD_FILES[@]}"
  elif ! backup_s3_is_configured; then
    echo
    echo "⚠ S3 non configuré — sauvegarde locale uniquement (voir .env.docker AWS_*)"
  fi
fi

echo
echo "=== Terminé ==="
echo "Conservation : ${RETENTION_DAYS} jours (${REMAINING} dump(s) restant(s))"
echo
echo "Restauration :"
echo "  ./scripts/db-restore.sh ${DUMP_FILE}"

if [ -x "${ROOT_DIR}/scripts/infra-status-export.sh" ]; then
  echo
  echo ">>> Mise à jour statut infra CRM…"
  BACKUP_DIR="$BACKUP_DIR" COMPOSE_FILES="$COMPOSE_FILES" "${ROOT_DIR}/scripts/infra-status-export.sh" || true
fi
