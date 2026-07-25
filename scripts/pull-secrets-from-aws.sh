#!/usr/bin/env bash
# Tire le secret JSON AWS Secrets Manager et régénère .env.docker.
#
# Prérequis :
#   - AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION
#     (exportés, ou déjà présents dans .env.docker)
#   - Secret JSON plat { "KEY": "value", ... } — ex. sdcreativ/prod/env
#   - Docker (utilise l’image amazon/aws-cli, comme les backups S3)
#
# Usage (VPS) :
#   ./scripts/pull-secrets-from-aws.sh
#   ./scripts/pull-secrets-from-aws.sh --dry-run
#   ./scripts/pull-secrets-from-aws.sh --restart
#
# Bootstrap VPS vide (pas encore de .env.docker) :
#   export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_REGION=eu-west-3
#   ./scripts/pull-secrets-from-aws.sh --restart

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# shellcheck disable=SC1091
source "${ROOT_DIR}/scripts/backup-s3-common.sh"

DRY_RUN=0
RESTART=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --restart) RESTART=1 ;;
    -h|--help)
      sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Option inconnue : $arg (utilisez --dry-run ou --restart)"
      exit 1
      ;;
  esac
done

# Creds : env shell prioritaire, sinon .env.docker existant.
PRESERVED_KEY="${AWS_ACCESS_KEY_ID:-}"
PRESERVED_SECRET="${AWS_SECRET_ACCESS_KEY:-}"
PRESERVED_REGION="${AWS_REGION:-}"

backup_s3_load_env

if [ -n "$PRESERVED_KEY" ]; then AWS_ACCESS_KEY_ID="$PRESERVED_KEY"; fi
if [ -n "$PRESERVED_SECRET" ]; then AWS_SECRET_ACCESS_KEY="$PRESERVED_SECRET"; fi
if [ -n "$PRESERVED_REGION" ]; then AWS_REGION="$PRESERVED_REGION"; fi

AWS_REGION="${AWS_REGION:-eu-west-3}"
SECRET_ID="${AWS_SECRETS_MANAGER_SECRET_ID:-sdcreativ/prod/env}"
ENV_DOCKER="${ROOT_DIR}/.env.docker"
COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yml -f docker-compose.prod.yml}"

if [ -z "${AWS_ACCESS_KEY_ID:-}" ] || [ -z "${AWS_SECRET_ACCESS_KEY:-}" ]; then
  echo "✗ AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY manquants."
  echo "  Exportez-les, ou créez d’abord un .env.docker minimal avec ces clés."
  exit 1
fi

echo "=== Pull Secrets Manager → .env.docker ==="
echo "Secret : ${SECRET_ID}"
echo "Région : ${AWS_REGION}"
echo

TMP_JSON="$(mktemp)"
TMP_ENV="$(mktemp)"
cleanup() {
  rm -f "$TMP_JSON" "$TMP_ENV"
}
trap cleanup EXIT

if ! backup_s3_aws "" secretsmanager get-secret-value \
  --secret-id "$SECRET_ID" \
  --region "$AWS_REGION" \
  --query SecretString \
  --output text >"$TMP_JSON"; then
  echo "✗ Impossible de lire le secret (IAM GetSecretValue ? nom/région ?)"
  exit 1
fi

if [ ! -s "$TMP_JSON" ] || [ "$(cat "$TMP_JSON")" = "None" ]; then
  echo "✗ Secret vide"
  exit 1
fi

python3 - "$TMP_JSON" "$TMP_ENV" <<'PY'
import json, sys
from pathlib import Path

src, dest = Path(sys.argv[1]), Path(sys.argv[2])
raw = src.read_text(encoding="utf-8").strip()
try:
    data = json.loads(raw)
except json.JSONDecodeError as e:
    print(f"✗ JSON invalide : {e}", file=sys.stderr)
    sys.exit(1)

if not isinstance(data, dict) or not data:
    print("✗ Le secret doit être un objet JSON non vide { \"KEY\": \"value\" }", file=sys.stderr)
    sys.exit(1)

lines = [
    "# Généré par scripts/pull-secrets-from-aws.sh — ne pas éditer à la main si vous synchronisez depuis AWS.",
    f"# Source : AWS Secrets Manager",
    "",
]

def encode_env_value(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        s = "true" if value else "false"
    elif isinstance(value, (int, float)) and not isinstance(value, bool):
        s = str(value)
    else:
        s = str(value)
    # Guillemets si caractères sensibles pour un fichier env Docker.
    if s == "" or any(c in s for c in ' \t\n\r#"\'\\$`'):
        escaped = (
            s.replace("\\", "\\\\")
            .replace('"', '\\"')
            .replace("\n", "\\n")
            .replace("\r", "\\r")
        )
        return f'"{escaped}"'
    return s

for key in sorted(data.keys(), key=str):
    name = str(key).strip()
    if not name or name.startswith("#") or "=" in name:
        print(f"⚠ Clé ignorée : {key!r}", file=sys.stderr)
        continue
    lines.append(f"{name}={encode_env_value(data[key])}")

dest.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"✓ {len(lines) - 3} variable(s) convertie(s)")
PY

if [ "$DRY_RUN" -eq 1 ]; then
  echo
  echo "--- dry-run (aperçu, secrets masqués) ---"
  python3 - "$TMP_ENV" <<'PY'
import re, sys
from pathlib import Path
text = Path(sys.argv[1]).read_text(encoding="utf-8")
for line in text.splitlines():
    if not line or line.startswith("#") or "=" not in line:
        print(line)
        continue
    k, _, v = line.partition("=")
    if len(v) <= 4:
        masked = "****"
    else:
        masked = v[:2] + "…" + v[-2:] if not v.startswith('"') else '"****"'
    print(f"{k}={masked}")
PY
  echo
  echo "Aucune écriture (.env.docker inchangé)."
  exit 0
fi

if [ -f "$ENV_DOCKER" ]; then
  BAK="${ENV_DOCKER}.bak.$(date +%Y%m%d-%H%M%S)"
  cp -p "$ENV_DOCKER" "$BAK"
  echo "✓ Backup : ${BAK}"
fi

umask 077
cp "$TMP_ENV" "$ENV_DOCKER"
chmod 600 "$ENV_DOCKER"
echo "✓ Écrit : ${ENV_DOCKER}"

if [ "$RESTART" -eq 1 ]; then
  # shellcheck disable=SC2206
  COMPOSE=(docker compose $COMPOSE_FILES)
  echo
  echo ">>> Restart conteneur app…"
  "${COMPOSE[@]}" up -d app
  echo "✓ app redémarré (env_file .env.docker rechargé)"
fi

echo
echo "=== Terminé ==="
echo "Vérifiez : docker compose ${COMPOSE_FILES} exec app printenv DATABASE_URL | head -c 40"
