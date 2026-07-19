-- Phase 3 — journalisation communications 3CX (chat / appels)

CREATE TABLE IF NOT EXISTS communication_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('chat', 'call', 'meeting')),
  direction VARCHAR(20) NOT NULL DEFAULT 'inbound'
    CHECK (direction IN ('inbound', 'outbound', 'internal', 'unknown')),
  external_id VARCHAR(200) NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  agent_extension VARCHAR(50),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_sec INTEGER,
  disposition VARCHAR(100),
  summary TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT communication_events_external_unique UNIQUE (channel, external_id)
);

CREATE INDEX IF NOT EXISTS idx_communication_events_lead
  ON communication_events (lead_id, started_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_communication_events_client
  ON communication_events (client_id, started_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_communication_events_started
  ON communication_events (started_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_communication_events_external
  ON communication_events (external_id);

-- Accélère le matching téléphone (digits only)
CREATE INDEX IF NOT EXISTS idx_leads_phone_digits
  ON leads (regexp_replace(COALESCE(phone, ''), '\D', '', 'g'))
  WHERE phone IS NOT NULL AND phone <> '';
CREATE INDEX IF NOT EXISTS idx_clients_phone_digits
  ON clients (regexp_replace(COALESCE(phone, ''), '\D', '', 'g'))
  WHERE phone IS NOT NULL AND phone <> '';
