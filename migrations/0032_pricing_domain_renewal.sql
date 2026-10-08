-- Renouvellement facturé directement par Hostinger au client (sans TVA SD CREATIV) :
-- on affiche hébergement + nom de domaine. Domaine .com au catalogue : 16,99 €/an (relevé 2026-10-07).

ALTER TABLE crm_settings
  ADD COLUMN IF NOT EXISTS pricing_domain_renewal_eur NUMERIC(10,2) NOT NULL DEFAULT 16.99;
