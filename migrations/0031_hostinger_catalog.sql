-- Prix des packs d'hébergement Hostinger lus via l'API officielle (catalogue), par durée.
-- Les changements détectés restent « en attente » jusqu'à validation dans l'admin.

CREATE TABLE IF NOT EXISTS hostinger_hosting_prices (
  pack_id VARCHAR(80) NOT NULL,
  months SMALLINT NOT NULL,
  pack_name VARCHAR(120) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  promo_cents INTEGER NOT NULL,
  renewal_cents INTEGER NOT NULL,
  list_cents INTEGER NOT NULL,
  pending_promo_cents INTEGER,
  pending_renewal_cents INTEGER,
  pending_list_cents INTEGER,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pack_id, months)
);

-- Pack + durée d'hébergement par formule (NULL = prix manuels des réglages, 12 mois).
ALTER TABLE public_pricing_plans
  ADD COLUMN IF NOT EXISTS hosting_pack_id VARCHAR(80),
  ADD COLUMN IF NOT EXISTS hosting_months SMALLINT;

-- Valeur du domaine offert (panier : 6,99 €) + date de dernière synchro du catalogue.
ALTER TABLE crm_settings
  ADD COLUMN IF NOT EXISTS pricing_domain_eur NUMERIC(10,2) NOT NULL DEFAULT 6.99,
  ADD COLUMN IF NOT EXISTS pricing_hosting_catalog_synced_at TIMESTAMPTZ;

-- Choix par défaut : Premium 12 mois pour Essentiel / Professionnel, Cloud Startup 12 mois pour
-- Business (e-commerce). Sans prix au catalogue, le calcul retombe sur les prix manuels.
UPDATE public_pricing_plans
SET hosting_pack_id = CASE WHEN slug = 'business' OR lower(name) = 'business'
                           THEN 'hostingerfr-hosting-cloudeconomy' ELSE 'hostingerfr-hosting-premium' END,
    hosting_months = 12
WHERE locale = 'fr' AND hosting_pack_id IS NULL
  AND (slug IN ('essentiel', 'professionnel', 'business') OR lower(name) IN ('essentiel', 'professionnel', 'business'));
