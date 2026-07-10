-- Phase 2 : signatures client + accès portail devis
-- Exécuter : psql "$DATABASE_URL" -f scripts/migrate-billing-phase2.sql

CREATE TABLE IF NOT EXISTS quote_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL UNIQUE REFERENCES quotes(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signature_data TEXT NOT NULL,
  signature_hash TEXT NOT NULL,
  ip_address VARCHAR(64),
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  proof_document_id UUID REFERENCES billing_documents(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_quote_signatures_quote ON quote_signatures (quote_id);
