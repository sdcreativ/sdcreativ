#!/usr/bin/env bash
# Vérifie les credentials S3 de .env.docker (sans afficher les secrets).
# Usage : ./scripts/aws-s3-rotation-check.sh
# Option : ./scripts/aws-s3-rotation-check.sh --write-smoke  (put+delete tmp/)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "${ROOT_DIR}/scripts/backup-s3-common.sh"
backup_s3_load_env

WRITE_SMOKE=0
if [ "${1:-}" = "--write-smoke" ]; then
  WRITE_SMOKE=1
fi

if ! backup_s3_is_configured; then
  echo "FAIL: AWS_* incomplets dans .env.docker"
  exit 1
fi

SUFFIX="${AWS_ACCESS_KEY_ID: -4}"
echo "env_file=.env.docker"
echo "region=${AWS_REGION}"
echo "bucket=${AWS_S3_BUCKET}"
echo "access_key_suffix=…${SUFFIX}"
if [ -f "${ROOT_DIR}/.env.docker" ]; then
  if stat -f 'env_mtime=%Sm' -t '%Y-%m-%d %H:%M' "${ROOT_DIR}/.env.docker" 2>/dev/null; then
    :
  else
    stat --printf 'env_mtime=%y\n' "${ROOT_DIR}/.env.docker"
  fi
fi

echo "--- sts ---"
IDENT_JSON="$(backup_s3_aws "" sts get-caller-identity --output json)"
python3 -c '
import json,sys
d=json.loads(sys.argv[1])
arn=d.get("Arn","")
acct=str(d.get("Account",""))
uid=str(d.get("UserId",""))
if arn.endswith(":root") or ":root" in arn.split("/")[0]:
    kind="ROOT"
elif ":user/" in arn:
    kind="IAM_USER"
elif ":assumed-role/" in arn:
    kind="ASSUMED_ROLE"
else:
    kind="OTHER"
print(f"principal={kind}")
print(f"account={acct}")
print(f"userId_eq_account={uid==acct}")
' "$IDENT_JSON"

echo "--- s3 head-bucket ---"
if backup_s3_aws "" s3api head-bucket --bucket "${AWS_S3_BUCKET}" >/dev/null 2>&1; then
  echo "OK"
else
  echo "FAIL"
  backup_s3_aws "" s3api head-bucket --bucket "${AWS_S3_BUCKET}" 2>&1 | head -5 || true
  exit 1
fi

echo "--- iam access-keys (CreateDate) ---"
if IAM_JSON="$(backup_s3_aws "" iam list-access-keys --output json 2>/dev/null)"; then
  python3 -c '
import json, sys
d = json.loads(sys.argv[1])
keys = d.get("AccessKeyMetadata", [])
print("count=%d" % len(keys))
for k in keys:
    kid = k.get("AccessKeyId", "")
    suffix = kid[-4:] if len(kid) >= 4 else "?"
    print("status=%s create=%s suffix=…%s" % (k.get("Status"), k.get("CreateDate"), suffix))
if not keys:
    print("WARN: aucune access key listée")
' "$IAM_JSON"
else
  echo "UNAVAILABLE (pas de iam:ListAccessKeys — console IAM requise)"
fi

if [ "$WRITE_SMOKE" -eq 1 ]; then
  KEY="tmp/rotation-smoke-$(date +%Y%m%d%H%M%S).txt"
  echo "--- write-smoke ${KEY} ---"
  echo "smoke $(date -u +%Y-%m-%dT%H:%M:%SZ)" | backup_s3_aws "" s3 cp - "s3://${AWS_S3_BUCKET}/${KEY}"
  backup_s3_aws "" s3 rm "s3://${AWS_S3_BUCKET}/${KEY}" >/dev/null
  echo "OK put+delete"
fi

echo "--- verdict ---"
echo "S3 credentials: OK"
echo "Rotation IAM: confirmer CreateDate en console si UNAVAILABLE ci-dessus,"
echo "  ou si le suffixe …${SUFFIX} n a pas change apres rotation."
