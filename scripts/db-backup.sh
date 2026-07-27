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

# shellcheck disable=SC1091
source "${ROOT_DIR}/scripts/lib/load-env-file.sh"

# Compose / Postgres : .env (hôte). AWS S3 : uniquement via backup_s3_load_env (.env.docker).
# load_env_file évite les plantages « set -u » / syntaxe bash sur un .env cassé.
load_env_file "${ROOT_DIR}/.env"

POSTGRES_USER="${POSTGRES_USER:-sdcreativ}"
POSTGRES_DB="${POSTGRES_DB:-sdcreativ}"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yml -f docker-compose.prod.yml}"
COMPOSE_PROFILE="${COMPOSE_PROFILE:-prod}"
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"

mkdir -p "$BACKUP_DIR"

COMPOSE=(docker compose)
# shellcheck disable=SC2206
COMPOSE+=($COMPOSE_FILES)
COMPOSE+=(--profile "$COMPOSE_PROFILE")

if ! command -v docker >/dev/null 2>&1; then
  echo "✗ docker introuvable dans PATH=${PATH}"
  exit 1
fi

postgres_cid="$("${COMPOSE[@]}" ps -q postgres 2>/dev/null | head -1 || true)"
if [ -z "$postgres_cid" ]; then
  echo "✗ Conteneur postgres introuvable. Lancez : ${COMPOSE[*]} up -d postgres"
  exit 1
fi
postgres_state="$(docker inspect -f '{{.State.Status}}' "$postgres_cid" 2>/dev/null || echo unknown)"
if [ "$postgres_state" != "running" ]; then
  echo "✗ Conteneur postgres non démarré (état=${postgres_state}). Lancez : ${COMPOSE[*]} up -d postgres"
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
# Ne doit pas empêcher la sauvegarde locale ni l’export infra en cas d’échec IAM/réseau.
S3_OK=1
if [ -f scripts/backup-s3-common.sh ]; then
  # shellcheck disable=SC1091
  source scripts/backup-s3-common.sh
  backup_s3_load_env
  if backup_s3_is_configured && [ "${#S3_UPLOAD_FILES[@]}" -gt 0 ]; then
    echo
    echo ">>> Envoi vers S3…"
    if ! "${ROOT_DIR}/scripts/backup-s3-upload.sh" "${S3_UPLOAD_FILES[@]}"; then
      S3_OK=0
      echo "⚠ Upload S3 échoué — dump local conservé : ${DUMP_FILE}"
    fi
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

if [ -x "${ROOT_DIR}/scripts/infra-status-export.sh" ] || [ -f "${ROOT_DIR}/scripts/infra-status-export.sh" ]; then
  echo
  echo ">>> Mise à jour statut infra CRM…"
  BACKUP_DIR="$BACKUP_DIR" COMPOSE_FILES="$COMPOSE_FILES" \
    bash "${ROOT_DIR}/scripts/infra-status-export.sh" || true
fi

if [ "$S3_OK" -ne 1 ]; then
  exit 2
fi
