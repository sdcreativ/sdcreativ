-- Hébergement Hostinger : coût de renouvellement (affiché sous l'avantage, transparence 2e année)
-- et date du dernier relevé des prix (rappel dans l'admin si trop ancien).
-- Valeurs relevées au panier Hostinger le 2026-10-07 : renouvellement 9,99 €/mois × 12 = 119,88 € HT.

ALTER TABLE crm_settings
  ADD COLUMN IF NOT EXISTS pricing_hosting_renewal_eur NUMERIC(10,2) NOT NULL DEFAULT 119.88,
  ADD COLUMN IF NOT EXISTS pricing_hosting_checked_on DATE NOT NULL DEFAULT DATE '2026-10-07';
