-- Accès espace client gérés depuis le CRM (code hashé en base)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_access_token_hash TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_access_created_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_access_last_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clients_portal_access_hash
  ON clients (portal_access_token_hash)
  WHERE portal_access_token_hash IS NOT NULL;
