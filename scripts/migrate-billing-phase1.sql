-- Phase 1 : cycle de vie devis / facturation (billing)
-- Exécuter : psql "$DATABASE_URL" -f scripts/migrate-billing-phase1.sql

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES crm_users(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(20);

CREATE TABLE IF NOT EXISTS billing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  kind VARCHAR(40) NOT NULL CHECK (kind IN (
    'quote_pdf', 'signed_quote_pdf', 'invoice_pdf', 'signature_proof'
  )),
  s3_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  sha256 TEXT NOT NULL,
  file_size BIGINT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_documents_quote ON billing_documents (quote_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_documents_invoice ON billing_documents (invoice_id, created_at DESC);

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('quote', 'invoice')),
  entity_id UUID NOT NULL,
  action VARCHAR(80) NOT NULL,
  actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('admin', 'client', 'system')),
  actor_id TEXT,
  actor_name TEXT,
  from_status VARCHAR(30),
  to_status VARCHAR(30),
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_entity ON billing_events (entity_type, entity_id, created_at DESC);
