-- Avantages promis (ex. « Maintenance de la 2ᵉ année à -50 % ») : structurés, figés à l'inscription,
-- enregistrés à la signature du devis puis appliqués automatiquement aux factures de maintenance.

ALTER TABLE site_popups
  ADD COLUMN IF NOT EXISTS benefit_kind VARCHAR(30) NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS benefit_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS benefit_start_months SMALLINT,
  ADD COLUMN IF NOT EXISTS benefit_duration_months SMALLINT;

-- Promesse figée sur chaque inscription (un changement ultérieur du popup ne la modifie pas).
ALTER TABLE site_popup_signups
  ADD COLUMN IF NOT EXISTS benefit_kind VARCHAR(30) NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS benefit_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS benefit_start_months SMALLINT,
  ADD COLUMN IF NOT EXISTS benefit_duration_months SMALLINT;

-- Offre en production : « Maintenance de la 2ᵉ année à -50 % » → -50 % dès le 12e mois, pendant 12 mois.
UPDATE site_popups
SET benefit_kind = 'maintenance_discount', benefit_percent = 50, benefit_start_months = 12, benefit_duration_months = 12
WHERE benefit_kind = 'none' AND offer_label ILIKE '%2%ann%50%';

UPDATE site_popup_signups s
SET benefit_kind = p.benefit_kind, benefit_percent = p.benefit_percent,
    benefit_start_months = p.benefit_start_months, benefit_duration_months = p.benefit_duration_months
FROM site_popups p
WHERE s.popup_id = p.id AND s.benefit_kind = 'none' AND p.benefit_kind <> 'none';

CREATE TABLE IF NOT EXISTS client_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  client_name VARCHAR(200) NOT NULL DEFAULT '',
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  signup_id UUID REFERENCES site_popup_signups(id) ON DELETE SET NULL,
  promo_code VARCHAR(40) NOT NULL,
  label VARCHAR(160) NOT NULL,
  kind VARCHAR(30) NOT NULL,
  percent NUMERIC(5,2) NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  -- pending : à venir · active : appliqué au moins une fois · completed : période terminée ·
  -- missed : période terminée sans application (alerte) · cancelled : annulé manuellement
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  applied_count INTEGER NOT NULL DEFAULT 0,
  last_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quote_id, promo_code)
);
CREATE INDEX IF NOT EXISTS idx_client_benefits_client ON client_benefits (client_id, status);
CREATE INDEX IF NOT EXISTS idx_client_benefits_dates ON client_benefits (status, starts_on);
