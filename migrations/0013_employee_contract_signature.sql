-- Signature duale contrats employés (native SD CREATIV + Yousign)

ALTER TABLE employee_contracts
  ADD COLUMN IF NOT EXISTS signature_provider VARCHAR(40),
  ADD COLUMN IF NOT EXISTS esign_external_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS esign_document_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS esign_signer_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS esign_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS esign_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS native_sign_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS native_sign_token_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_employee_contracts_esign_external
  ON employee_contracts (esign_external_id)
  WHERE esign_external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employee_contracts_native_token
  ON employee_contracts (native_sign_token_hash)
  WHERE native_sign_token_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS employee_contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL UNIQUE REFERENCES employee_contracts(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signature_data TEXT NOT NULL,
  signature_hash TEXT NOT NULL,
  document_sha256 TEXT,
  otp_verified_at TIMESTAMPTZ,
  provider VARCHAR(40) NOT NULL DEFAULT 'native',
  ip_address VARCHAR(64),
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proof_s3_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_contract_signature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES employee_contracts(id) ON DELETE CASCADE,
  provider VARCHAR(40) NOT NULL DEFAULT 'yousign',
  event_type VARCHAR(80) NOT NULL,
  external_id VARCHAR(120),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_contract_signature_events_contract
  ON employee_contract_signature_events (contract_id, created_at DESC);

-- Étendre les entity_type génériques (OTP + journal)
ALTER TABLE signature_otp_challenges
  DROP CONSTRAINT IF EXISTS signature_otp_challenges_entity_type_check;

ALTER TABLE signature_otp_challenges
  ADD CONSTRAINT signature_otp_challenges_entity_type_check
  CHECK (entity_type IN ('quote', 'contract', 'employee_contract'));

ALTER TABLE signature_events
  DROP CONSTRAINT IF EXISTS signature_events_entity_type_check;

ALTER TABLE signature_events
  ADD CONSTRAINT signature_events_entity_type_check
  CHECK (entity_type IN ('quote', 'contract', 'employee_contract'));

-- entity_type un peu plus long si besoin
ALTER TABLE signature_otp_challenges
  ALTER COLUMN entity_type TYPE VARCHAR(32);

ALTER TABLE signature_events
  ALTER COLUMN entity_type TYPE VARCHAR(32);
