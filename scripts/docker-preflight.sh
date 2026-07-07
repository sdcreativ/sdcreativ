#!/usr/bin/env bash
# Vérifie que la stack Docker prod est prête avant déploiement VPS.
# Usage : ./scripts/docker-preflight.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

errors=0
warn=0

fail() {
  echo "✗ $1"
  errors=$((errors + 1))
}

warn_msg() {
  echo "⚠ $1"
  warn=$((warn + 1))
}

ok() {
  echo "✓ $1"
}

# Lit une variable KEY=value sans interpréter le shell (espaces, +, etc.)
env_val() {
  local file=$1 key=$2
  [ -f "$file" ] || return 1
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^["'\''"]//; s/["'\''"]$//'
}

echo "=== Pré-vol Docker production — SD CREATIV ==="
echo

# --- Fichiers requis ---
if [ -f .env ]; then
  ok ".env présent (ports Compose)"
else
  fail ".env manquant — copiez les variables DOMAIN/POSTGRES/APP_PORT (voir docs/DOCKER-PRODUCTION.md)"
fi

if [ -f .env.docker ]; then
  ok ".env.docker présent (secrets app)"
else
  fail ".env.docker manquant — cp .env.docker.example .env.docker puis complétez les secrets"
fi

if [ -f docker/nginx/conf.d/sdcreativ.conf.template ]; then
  ok "Template Nginx présent"
else
  fail "docker/nginx/conf.d/sdcreativ.conf.template introuvable"
fi

# --- Variables .env ---
if [ -f .env ]; then
  DOMAIN="$(env_val .env DOMAIN)"
  CERTBOT_EMAIL="$(env_val .env CERTBOT_EMAIL)"
  POSTGRES_PASSWORD="$(env_val .env POSTGRES_PASSWORD)"

  if [ -n "${DOMAIN:-}" ]; then
    ok "DOMAIN=$DOMAIN"
  else
    fail "DOMAIN non défini dans .env"
  fi

  if [ -n "${CERTBOT_EMAIL:-}" ]; then
    ok "CERTBOT_EMAIL=$CERTBOT_EMAIL"
  else
    fail "CERTBOT_EMAIL non défini dans .env"
  fi

  if [ "${POSTGRES_PASSWORD:-}" = "postgres" ] || [ "${POSTGRES_PASSWORD:-}" = "change_me_strong_password" ]; then
    warn_msg "POSTGRES_PASSWORD faible ou par défaut — changez-le avant la prod"
  else
    ok "POSTGRES_PASSWORD défini"
  fi
fi

# --- Variables .env.docker ---
if [ -f .env.docker ]; then
  ADMIN_SECRET="$(env_val .env.docker ADMIN_SECRET)"
  RESEND_API_KEY="$(env_val .env.docker RESEND_API_KEY)"
  site_url="$(env_val .env.docker NEXT_PUBLIC_SITE_URL)"
  DATABASE_URL="$(env_val .env.docker DATABASE_URL)"
  domain="${DOMAIN:-sdcreativ.com}"

  if [ -n "${ADMIN_SECRET:-}" ] && [ "${ADMIN_SECRET:-}" != "123456" ]; then
    ok "ADMIN_SECRET défini (non trivial)"
  elif [ -n "${ADMIN_SECRET:-}" ]; then
    warn_msg "ADMIN_SECRET=123456 — acceptable en local, changez-le en prod"
  else
    fail "ADMIN_SECRET manquant dans .env.docker"
  fi

  if [ -n "${RESEND_API_KEY:-}" ]; then
    ok "RESEND_API_KEY défini"
  else
    warn_msg "RESEND_API_KEY vide — emails contact / CRM désactivés"
  fi

  if [[ "$site_url" == "https://${domain}"* ]] || [[ "$site_url" == "https://www.${domain}"* ]]; then
    ok "NEXT_PUBLIC_SITE_URL=$site_url"
  else
    warn_msg "NEXT_PUBLIC_SITE_URL devrait être https://${domain} en prod (actuel : ${site_url:-vide})"
  fi

  if [[ "${DATABASE_URL:-}" == *"@postgres:5432"* ]]; then
    ok "DATABASE_URL pointe vers le service Docker postgres"
  else
    fail "DATABASE_URL doit utiliser @postgres:5432 dans .env.docker"
  fi
fi

# --- Docker ---
if command -v docker >/dev/null 2>&1; then
  ok "Docker installé ($(docker --version | head -1))"
else
  fail "Docker non installé"
fi

if docker compose version >/dev/null 2>&1; then
  ok "Docker Compose disponible"
else
  fail "docker compose non disponible"
fi

# --- Validation compose ---
if [ -f .env ] && [ -f .env.docker ]; then
  if docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod config >/dev/null 2>&1; then
    ok "docker compose config (prod) valide"
  else
    fail "docker compose config (prod) invalide — lancez : docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod config"
  fi
fi

# --- DNS (optionnel, seulement si dig disponible) ---
if [ -n "${DOMAIN:-}" ] && command -v dig >/dev/null 2>&1; then
  mapfile -t dns_ips < <(dig +short "$DOMAIN" | grep -E '^[0-9.]+$' | sort -u)
  if [ "${#dns_ips[@]}" -eq 0 ]; then
    warn_msg "DNS $DOMAIN ne résout pas encore vers une IP — requis avant init-letsencrypt.sh"
  elif [ "${#dns_ips[@]}" -gt 1 ]; then
    warn_msg "DNS $DOMAIN a plusieurs A records (${dns_ips[*]}) — gardez uniquement l'IP du VPS"
    ok "DNS $DOMAIN → ${dns_ips[0]}"
  else
    ok "DNS $DOMAIN → ${dns_ips[0]}"
  fi
fi

echo
if [ "$errors" -gt 0 ]; then
  echo "Résultat : $errors erreur(s), $warn avertissement(s) — corrigez avant le déploiement."
  exit 1
fi

if [ "$warn" -gt 0 ]; then
  echo "Résultat : OK avec $warn avertissement(s). Vous pouvez lancer ./scripts/docker-prod-deploy.sh"
else
  echo "Résultat : tout est prêt. Lancez ./scripts/docker-prod-deploy.sh sur le VPS."
fi
