#!/usr/bin/env bash
# Migre les données screativ → sdcreativ (table leads).
# Usage : npm run db:migrate
#         ou ./scripts/migrate-screativ-to-sdcreativ.sh

set -euo pipefail

OLD_URL="${OLD_DATABASE_URL:-postgresql://user:postgres@localhost:5432/screativ}"
NEW_URL="${NEW_DATABASE_URL:-postgresql://user:postgres@localhost:5432/sdcreativ}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "→ Initialisation schéma sdcreativ…"
psql "$NEW_URL" -f "$ROOT/scripts/db-init.sql" -q

if ! psql "$OLD_URL" -c "SELECT 1 FROM leads LIMIT 1;" -q 2>/dev/null; then
  echo "✓ Base screativ absente ou sans table leads — rien à migrer."
  exit 0
fi

OLD_COUNT=$(psql "$OLD_URL" -t -A -c "SELECT COUNT(*) FROM leads;")
echo "→ Leads dans screativ : $OLD_COUNT"

if [ "$OLD_COUNT" = "0" ]; then
  echo "✓ Source vide — migration terminée."
  exit 0
fi

TMPFILE=$(mktemp /tmp/leads-migrate.XXXXXX.csv)
trap 'rm -f "$TMPFILE"' EXIT

echo "→ Copie des enregistrements…"
psql "$OLD_URL" -q -c "\COPY leads TO '$TMPFILE' WITH (FORMAT csv, HEADER true)"

psql "$NEW_URL" -q <<SQL
CREATE TEMP TABLE leads_staging (LIKE leads INCLUDING ALL);
SQL

psql "$NEW_URL" -q -c "\COPY leads_staging FROM '$TMPFILE' WITH (FORMAT csv, HEADER true)"

psql "$NEW_URL" -q -c "
INSERT INTO leads (
  id, name, email, phone, company, source, status,
  service, budget, timeline, message, estimated_value, metadata,
  created_at, updated_at
)
SELECT
  id, name, email, phone, company, source, status,
  service, budget, timeline, message, estimated_value, metadata,
  created_at, updated_at
FROM leads_staging
ON CONFLICT (id) DO NOTHING;
"

NEW_COUNT=$(psql "$NEW_URL" -t -A -c "SELECT COUNT(*) FROM leads;")
echo "✓ Migration terminée — $NEW_COUNT lead(s) dans sdcreativ."
