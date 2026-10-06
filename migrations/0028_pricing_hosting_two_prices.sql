-- Hébergement Hostinger : on saisit les deux prix réels relevés au panier (HT) au lieu d'un
-- prix + pourcentage. Normal : Pack Premium 12 mois 143,88 € + domaine 6,99 € = 150,87 € ;
-- avec le lien de parrainage : 35,88 €. La remise (~76 %) est calculée.

ALTER TABLE crm_settings
  ADD COLUMN IF NOT EXISTS pricing_hosting_referral_eur NUMERIC(10,2) NOT NULL DEFAULT 35.88;

ALTER TABLE crm_settings ALTER COLUMN pricing_hosting_eur SET DEFAULT 150.87;

-- Remplace l'ancienne valeur par défaut seulement si elle n'a pas été personnalisée.
UPDATE crm_settings SET pricing_hosting_eur = 150.87 WHERE pricing_hosting_eur = 143.86;
-- pricing_referral_percent (0025) n'est plus utilisé ; conservé pour ne rien supprimer.
