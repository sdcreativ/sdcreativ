#!/usr/bin/env bash
# Sauvegarde / restauration de public/uploads (hôte ou volume Docker app).
# Prérequis : le script appelant définit le tableau COMPOSE (docker compose …).

backup_uploads__volume_name() {
  "${COMPOSE[@]}" volume ls -q 2>/dev/null | grep 'uploads_data' | head -1 || true
}

backup_uploads__app_running() {
  "${COMPOSE[@]}" ps --status running app 2>/dev/null | grep -qE '\bapp\b'
}

backup_uploads__create_from_app() {
  local archive="$1"
  if ! "${COMPOSE[@]}" exec -T app sh -c '[ -d /app/public/uploads ] && [ -n "$(ls -A /app/public/uploads 2>/dev/null)" ]'; then
    return 1
  fi
  "${COMPOSE[@]}" exec -T app tar -czf - -C /app/public uploads > "$archive"
}

backup_uploads__create_from_volume() {
  local archive="$1"
  local vol
  vol="$(backup_uploads__volume_name)"
  [ -n "$vol" ] || return 1
  if ! docker run --rm -v "${vol}:/uploads:ro" alpine sh -c '[ -n "$(ls -A /uploads 2>/dev/null)" ]'; then
    return 1
  fi
  docker run --rm -v "${vol}:/uploads:ro" alpine tar -czf - -C / uploads > "$archive"
}

backup_uploads__create_from_host() {
  local archive="$1"
  [ -d public/uploads ] || return 1
  [ -n "$(ls -A public/uploads 2>/dev/null)" ] || return 1
  tar -czf "$archive" -C public uploads
}

# Crée l'archive uploads ; affiche son chemin sur stdout ou échoue silencieusement.
backup_uploads_create_archive() {
  local backup_dir="$1"
  local timestamp="$2"
  local archive="${backup_dir}/sdcreativ-uploads-${timestamp}.tar.gz"

  if backup_uploads__app_running && backup_uploads__create_from_app "$archive"; then
    :
  elif backup_uploads__create_from_volume "$archive"; then
    :
  elif backup_uploads__create_from_host "$archive"; then
    :
  else
    return 1
  fi

  [ -s "$archive" ] || return 1
  echo "$archive"
}

backup_uploads_restore_archive() {
  local archive="$1"
  [ -f "$archive" ] || return 1

  if backup_uploads__app_running; then
    cat "$archive" | "${COMPOSE[@]}" exec -T app tar -xzf - -C /app/public
    echo "✓ Uploads restaurés dans le conteneur app (/app/public/uploads)"
    return 0
  fi

  local vol
  vol="$(backup_uploads__volume_name)"
  if [ -n "$vol" ]; then
    cat "$archive" | docker run --rm -i -v "${vol}:/uploads" alpine tar -xzf - -C /
    echo "✓ Uploads restaurés dans le volume Docker (${vol})"
    return 0
  fi

  mkdir -p public/uploads
  tar -xzf "$archive" -C public
  echo "✓ Uploads restaurés dans public/uploads/"
}
