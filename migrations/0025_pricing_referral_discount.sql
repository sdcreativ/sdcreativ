-- Remise parrainage (ex. Hostinger -20 %) appliquée aux charges concernées (hébergement) :
-- la carte affiche le TTC sans remise barré + le TTC remisé.
-- Additif : aucune formule existante ne change d'affichage (price_compare_at NULL).

ALTER TABLE public_pricing_plans
  ADD COLUMN IF NOT EXISTS price_compare_at INTEGER,
  ADD COLUMN IF NOT EXISTS discount_label VARCHAR(60);

ALTER TABLE crm_settings
  ADD COLUMN IF NOT EXISTS pricing_referral_url VARCHAR(500) NOT NULL
    DEFAULT 'https://www.hostinger.com/fr?REFERRALCODE=BMJAGENCEZMT',
  ADD COLUMN IF NOT EXISTS pricing_referral_percent NUMERIC(5,2) NOT NULL DEFAULT 20;
