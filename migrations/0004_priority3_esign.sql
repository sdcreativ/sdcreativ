-- Priorité 3 : signature électronique tierce (Yousign) sur contrats

ALTER TABLE crm_contracts
  ADD COLUMN IF NOT EXISTS signature_provider VARCHAR(40),
  ADD COLUMN IF NOT EXISTS esign_external_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS esign_document_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS esign_signer_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS esign_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS esign_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_crm_contracts_esign_external
  ON crm_contracts (esign_external_id)
  WHERE esign_external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS contract_signature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES crm_contracts(id) ON DELETE CASCADE,
  provider VARCHAR(40) NOT NULL DEFAULT 'yousign',
  event_type VARCHAR(80) NOT NULL,
  external_id VARCHAR(120),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contract_signature_events_contract
  ON contract_signature_events (contract_id, created_at DESC);
