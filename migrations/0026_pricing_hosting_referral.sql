-- La remise parrainage Hostinger (-20 %) porte uniquement sur l'hébergement 1 an (143,86 €),
-- poste dédié inclus ou non par formule — plus sur des charges quelconques.

ALTER TABLE public_pricing_plans
  ADD COLUMN IF NOT EXISTS include_hosting BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE crm_settings
  ADD COLUMN IF NOT EXISTS pricing_hosting_eur NUMERIC(10,2) NOT NULL DEFAULT 143.86;

-- Les remises par charge (0025) ne sont plus utilisées : on les retire des données.
UPDATE public_pricing_plans
SET charges = (SELECT COALESCE(jsonb_agg(c - 'discountPercent'), '[]'::jsonb) FROM jsonb_array_elements(charges) c)
WHERE charges::text LIKE '%discountPercent%';
