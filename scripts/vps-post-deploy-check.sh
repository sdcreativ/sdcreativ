#!/usr/bin/env bash
# Checklist automatisée post-déploiement VPS.
#
# Usage :
#   chmod +x scripts/vps-post-deploy-check.sh
#   ./scripts/vps-post-deploy-check.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

errors=0
warn=0

fail() { echo "✗ $1"; errors=$((errors + 1)); }
warn_msg() { echo "⚠ $1"; warn=$((warn + 1)); }
ok() { echo "✓ $1"; }

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/scripts/lib/load-env-file.sh"
  load_env_file "$ROOT_DIR/.env"
  set +a
fi

DOMAIN="${DOMAIN:-sdcreativ.com}"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sdcreativ}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"

echo "=== Checklist post-déploiement — SD CREATIV ==="
echo "Domaine : ${DOMAIN}"
echo

# --- Services Docker ---
for svc in app postgres redis nginx; do
  if $COMPOSE ps --status running "$svc" 2>/dev/null | grep -q "$svc"; then
    ok "Service ${svc} : running"
  else
    fail "Service ${svc} : absent ou arrêté"
  fi
done

if $COMPOSE ps --status running certbot 2>/dev/null | grep -q certbot; then
  ok "Service certbot : running"
else
  warn_msg "Service certbot : absent (SSL auto-renew peut être inactif)"
fi

# --- Healthchecks ---
if $COMPOSE ps app 2>/dev/null | grep -qE 'healthy|\(healthy\)'; then
  ok "Healthcheck app : healthy"
else
  warn_msg "Healthcheck app : pas encore healthy (récent déploiement ?)"
fi

# --- HTTP / HTTPS ---
HTTP_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "http://${DOMAIN}/" 2>/dev/null || echo "000")"
if [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "308" ] || [ "$HTTP_CODE" = "302" ]; then
  ok "HTTP → redirection (${HTTP_CODE})"
elif [ "$HTTP_CODE" = "200" ]; then
  warn_msg "HTTP répond 200 — vérifiez la redirection vers HTTPS"
else
  fail "HTTP ${DOMAIN} : code ${HTTP_CODE}"
fi

HTTPS_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "https://${DOMAIN}/" 2>/dev/null || echo "000")"
if [ "$HTTPS_CODE" = "200" ]; then
  ok "HTTPS accueil : 200"
else
  fail "HTTPS ${DOMAIN} : code ${HTTPS_CODE}"
fi

ADMIN_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "https://${DOMAIN}/admin/login" 2>/dev/null || echo "000")"
if [ "$ADMIN_CODE" = "200" ]; then
  ok "CRM /admin/login : accessible"
else
  fail "CRM /admin/login : code ${ADMIN_CODE}"
fi

HSTS_HEADER="$(curl -sSI --max-time 15 "https://${DOMAIN}/" 2>/dev/null | grep -i '^strict-transport-security:' || true)"
if [ -n "$HSTS_HEADER" ]; then
  ok "HSTS actif"
else
  fail "HSTS absent — regénérez Nginx depuis sdcreativ.conf.template et rechargez"
fi

RSS_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "https://${DOMAIN}/blog/feed.xml" 2>/dev/null || echo "000")"
if [ "$RSS_CODE" = "200" ]; then
  ok "Flux RSS /blog/feed.xml : 200"
else
  warn_msg "Flux RSS : code ${RSS_CODE}"
fi

# --- Secrets ---
if [ -f .env.docker ]; then
  if grep -qE '^ADMIN_SECRET=(CHANGE|change|your|test|$)' .env.docker 2>/dev/null; then
    fail "ADMIN_SECRET semble être une valeur par défaut"
  else
    ok "ADMIN_SECRET défini"
  fi
  if grep -qE '^POSTGRES_PASSWORD=(sdcreativ|CHANGE|change)' .env 2>/dev/null; then
    warn_msg "POSTGRES_PASSWORD faible ou par défaut dans .env"
  else
    ok "POSTGRES_PASSWORD personnalisé"
  fi
else
  fail ".env.docker manquant"
fi

if [ -f .env.docker ]; then
  turnstile_site="$(grep -E '^NEXT_PUBLIC_TURNSTILE_SITE_KEY=' .env.docker 2>/dev/null | cut -d= -f2- | sed 's/^["'\''"]//; s/["'\''"]$//' || true)"
  turnstile_secret="$(grep -E '^TURNSTILE_SECRET_KEY=' .env.docker 2>/dev/null | cut -d= -f2- | sed 's/^["'\''"]//; s/["'\''"]$//' || true)"
  if [ -n "${turnstile_site:-}" ] && [ -n "${turnstile_secret:-}" ]; then
    ok "Turnstile configuré"
  elif [ -n "${turnstile_site:-}" ] || [ -n "${turnstile_secret:-}" ]; then
    fail "Turnstile incomplet — les deux clés sont requises dans .env.docker"
  else
    warn_msg "Turnstile absent — activez Cloudflare Turnstile pour les formulaires publics"
  fi
fi

# --- Disque ---
DISK_USE="$(df -P / | awk 'NR==2 {print $5}' | tr -d '%')"
if [ "$DISK_USE" -lt 85 ]; then
  ok "Espace disque / : ${DISK_USE}% utilisé"
else
  warn_msg "Espace disque / : ${DISK_USE}% — surveiller"
fi

# --- Sauvegardes ---
if [ -d "$BACKUP_DIR" ] && [ "$(find "$BACKUP_DIR" -maxdepth 1 -name 'sdcreativ-*.dump' 2>/dev/null | head -1)" ]; then
  LATEST="$(find "$BACKUP_DIR" -maxdepth 1 -name 'sdcreativ-*.dump' -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)"
  if [ -z "$LATEST" ]; then
    LATEST="$(ls -t "$BACKUP_DIR"/sdcreativ-*.dump 2>/dev/null | head -1 || true)"
  fi
  ok "Sauvegarde trouvée : $(basename "$LATEST")"
else
  warn_msg "Aucune sauvegarde dans ${BACKUP_DIR} — lancez ./scripts/db-backup.sh et installez le cron"
fi

if crontab -u "$DEPLOY_USER" -l 2>/dev/null | grep -qF 'db-backup.sh'; then
  ok "Cron sauvegarde installé (${DEPLOY_USER}, 3h)"
else
  warn_msg "Cron sauvegarde absent — ./scripts/install-backup-cron.sh"
fi

if crontab -u "$DEPLOY_USER" -l 2>/dev/null | grep -qF 'infra-status-export.sh'; then
  ok "Cron infra CRM installé (${DEPLOY_USER}, /15 min)"
else
  warn_msg "Cron infra absent — ./scripts/install-backup-cron.sh"
fi

if [ -f "${BACKUP_DIR}/infra-status.json" ]; then
  ok "Statut infra CRM : ${BACKUP_DIR}/infra-status.json"
else
  warn_msg "Statut infra absent — ./scripts/infra-status-export.sh"
fi

# --- S3 sauvegardes ---
if [ -f scripts/backup-s3-common.sh ]; then
  # shellcheck disable=SC1091
  source scripts/backup-s3-common.sh
  backup_s3_load_env
  if backup_s3_is_configured; then
    ok "S3 configuré (${AWS_S3_BUCKET}/${AWS_S3_BACKUP_PREFIX}/)"
    if S3_DUMPS="$(backup_s3_list_dumps 2>/dev/null | head -1)" && [ -n "$S3_DUMPS" ]; then
      ok "Dernier dump S3 : ${S3_DUMPS}"
    else
      warn_msg "Aucun dump sur S3 — lancez ./scripts/db-backup.sh"
    fi
  else
    warn_msg "S3 non configuré — ajoutez AWS_* dans .env.docker pour sauvegardes distantes"
  fi
fi

# --- Pare-feu (optionnel) ---
if command -v ufw >/dev/null 2>&1; then
  if ufw status 2>/dev/null | grep -q "Status: active"; then
    ok "UFW actif"
  else
    warn_msg "UFW inactif — recommandé : ports 22, 80, 443 uniquement"
  fi
fi

echo
echo "=== Résumé ==="
echo "Erreurs   : ${errors}"
echo "Avertissements : ${warn}"
echo

if [ "$errors" -gt 0 ]; then
  echo "Corrigez les erreurs avant de considérer la prod comme stable."
  exit 1
fi

echo "Post-déploiement OK (vérifiez manuellement : formulaire contact, connexion CRM, envoi email)."
exit 0
