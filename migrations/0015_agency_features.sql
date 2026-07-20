-- Portail prestataire (token BDC) + templates WhatsApp leads

ALTER TABLE vendor_purchase_orders
  ADD COLUMN IF NOT EXISTS portal_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS portal_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS portal_deliverable_note TEXT,
  ADD COLUMN IF NOT EXISTS portal_delivered_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_po_portal_token_hash
  ON vendor_purchase_orders (portal_token_hash)
  WHERE portal_token_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  template_id VARCHAR(80) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'sent',
  provider VARCHAR(30) NOT NULL DEFAULT 'console',
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_lead ON whatsapp_message_logs (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_client ON whatsapp_message_logs (client_id, created_at DESC);
