-- Suivi des sources : provenance des prospects (publicité, recherche, partenaire…) et
-- compteurs anonymes de visites et de clics WhatsApp par canal / campagne.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS attribution JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS acquisition_channel VARCHAR(30);
CREATE INDEX IF NOT EXISTS idx_leads_acquisition ON leads (acquisition_channel, created_at DESC);

-- Aucune donnée personnelle (ni IP, ni identifiant de visiteur) : de simples compteurs datés.
CREATE TABLE IF NOT EXISTS marketing_events (
  id BIGSERIAL PRIMARY KEY,
  kind VARCHAR(30) NOT NULL,
  channel VARCHAR(30) NOT NULL,
  campaign VARCHAR(120),
  path VARCHAR(300),
  cta VARCHAR(60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_marketing_events_kind_date ON marketing_events (kind, created_at DESC);
