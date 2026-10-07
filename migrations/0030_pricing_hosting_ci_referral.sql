-- Panier Hostinger relevé depuis la Côte d'Ivoire (2026-10-07), avec le lien de parrainage :
-- Pack Premium 12 mois 35,88 € (promo) − REFERRALDISCOUNT 20 % (7,18 €) = 28,70 €, taxes 0 €.
-- Seuls 20 % viennent du parrainage : la mention le dit explicitement.
-- Valeurs remplacées uniquement si elles n'ont pas été personnalisées dans l'admin.

ALTER TABLE crm_settings ALTER COLUMN pricing_hosting_referral_eur SET DEFAULT 28.70;
UPDATE crm_settings SET pricing_hosting_referral_eur = 28.70 WHERE pricing_hosting_referral_eur = 35.88;

ALTER TABLE crm_settings
  ALTER COLUMN pricing_referral_note SET DEFAULT 'Tarif promo Hostinger + 20 % de remise parrainage SD CREATIV';
UPDATE crm_settings
SET pricing_referral_note = 'Tarif promo Hostinger + 20 % de remise parrainage SD CREATIV'
WHERE pricing_referral_note = '-{pourcentage} % grâce à notre partenariat Hostinger';

UPDATE crm_settings SET pricing_hosting_checked_on = DATE '2026-10-07' WHERE pricing_hosting_checked_on < DATE '2026-10-07';
