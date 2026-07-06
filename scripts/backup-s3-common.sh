#!/usr/bin/env bash
# Helpers S3 pour les sauvegardes (via conteneur amazon/aws-cli).
# Source : source scripts/backup-s3-common.sh

backup_s3_load_env() {
  ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
  cd "$ROOT_DIR"

  if [ -f .env.docker ]; then
    set -a
    # shellcheck disable=SC1091
    source .env.docker
    set +a
  fi

  AWS_S3_BACKUP_PREFIX="${AWS_S3_BACKUP_PREFIX:-backups/sdcreativ}"
  S3_BACKUP_RETENTION_DAYS="${S3_BACKUP_RETENTION_DAYS:-30}"
  AWS_CLI_IMAGE="${AWS_CLI_IMAGE:-amazon/aws-cli:2.22.12}"
}

backup_s3_is_configured() {
  [ -n "${AWS_ACCESS_KEY_ID:-}" ] \
    && [ -n "${AWS_SECRET_ACCESS_KEY:-}" ] \
    && [ -n "${AWS_S3_BUCKET:-}" ] \
    && [ -n "${AWS_REGION:-}" ]
}

backup_s3_uri() {
  local key="$1"
  echo "s3://${AWS_S3_BUCKET}/${AWS_S3_BACKUP_PREFIX}/${key}"
}

backup_s3_aws() {
  local mount_dir="${1:-}"
  shift

  local -a docker_args=(
    run --rm
    -e "AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}"
    -e "AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}"
    -e "AWS_DEFAULT_REGION=${AWS_REGION}"
  )

  if [ -n "$mount_dir" ]; then
    docker_args+=(-v "${mount_dir}:/data")
  fi

  docker "${docker_args[@]}" "$AWS_CLI_IMAGE" "$@"
}

backup_s3_upload_file() {
  local local_path="$1"
  local basename mount_dir
  basename="$(basename "$local_path")"
  mount_dir="$(cd "$(dirname "$local_path")" && pwd)"

  backup_s3_aws "$mount_dir" s3 cp "/data/${basename}" "$(backup_s3_uri "$basename")"
  echo "✓ S3 upload : $(backup_s3_uri "$basename")"
}

backup_s3_download_file() {
  local key="$1"
  local dest_dir="$2"
  local basename
  basename="$(basename "$key")"

  mkdir -p "$dest_dir"
  backup_s3_aws "$dest_dir" s3 cp "$(backup_s3_uri "$basename")" "/data/${basename}"
  echo "${dest_dir}/${basename}"
}

backup_s3_list_dumps() {
  backup_s3_aws "" s3 ls "s3://${AWS_S3_BUCKET}/${AWS_S3_BACKUP_PREFIX}/" \
    | awk '{print $4}' \
    | grep -E '\.dump$' \
    | sort -r
}

backup_s3_prune_old() {
  local cutoff
  cutoff="$(date -v-"${S3_BACKUP_RETENTION_DAYS}"d +%Y%m%d 2>/dev/null || date -d "-${S3_BACKUP_RETENTION_DAYS} days" +%Y%m%d)"

  echo ">>> Rotation S3 (avant ${cutoff})…"
  while IFS= read -r key; do
    [ -z "$key" ] && continue
    file_date="$(echo "$key" | grep -oE '[0-9]{8}' | head -1 || true)"
    if [ -n "$file_date" ] && [ "$file_date" -lt "$cutoff" ]; then
      backup_s3_aws "" s3 rm "$(backup_s3_uri "$key")" || true
      echo "  supprimé : ${key}"
    fi
  done < <(backup_s3_list_dumps 2>/dev/null || true)
}

backup_s3_write_manifest() {
  local manifest_path="$1"
  local mount_dir basename
  mount_dir="$(cd "$(dirname "$manifest_path")" && pwd)"
  basename="$(basename "$manifest_path")"

  backup_s3_aws "$mount_dir" s3 cp "/data/${basename}" "$(backup_s3_uri "$basename")"
  echo "✓ Manifest S3 : $(backup_s3_uri "$basename")"
}
