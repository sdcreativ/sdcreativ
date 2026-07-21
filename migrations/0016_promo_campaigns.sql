-- Campagnes de relance promotionnelles (MVP — pas de loterie)
-- + opt-in marketing sur leads (A: newsletter OU B: flag lead)

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS promo_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  offer_title TEXT NOT NULL,
  offer_description TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'ended')),
  email_subject TEXT NOT NULL,
  email_html TEXT NOT NULL,
  created_by UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS promo_campaign_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES promo_campaigns(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'eligible'
    CHECK (status IN ('eligible', 'sent', 'clicked', 'confirmed', 'converted', 'excluded')),
  sent_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, quote_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_campaigns_status ON promo_campaigns (status, ends_at);
CREATE INDEX IF NOT EXISTS idx_promo_enrollments_campaign ON promo_campaign_enrollments (campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_promo_enrollments_email ON promo_campaign_enrollments (email);
CREATE INDEX IF NOT EXISTS idx_leads_marketing_opt_in ON leads (marketing_opt_in) WHERE marketing_opt_in = true;
