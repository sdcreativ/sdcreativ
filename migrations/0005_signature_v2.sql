-- Signature SD CREATIV v2 : OTP email, audit trail, empreinte document

CREATE TABLE IF NOT EXISTS signature_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('quote', 'contract')),
  entity_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_signature_otp_entity
  ON signature_otp_challenges (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signature_otp_active
  ON signature_otp_challenges (entity_type, entity_id)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS signature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('quote', 'contract')),
  entity_id UUID NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  ip_address VARCHAR(64),
  user_agent TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_signature_events_entity
  ON signature_events (entity_type, entity_id, created_at DESC);

ALTER TABLE quote_signatures
  ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS document_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS provider VARCHAR(40) NOT NULL DEFAULT 'native';

CREATE TABLE IF NOT EXISTS contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL UNIQUE REFERENCES crm_contracts(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_contract_signatures_contract
  ON contract_signatures (contract_id);

ALTER TABLE crm_contracts
  ADD COLUMN IF NOT EXISTS native_sign_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS native_sign_token_expires_at TIMESTAMPTZ;
