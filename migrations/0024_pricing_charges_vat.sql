-- Formules tarifaires : calcul automatique du TTC (prix de base HT + charges HT + TVA globale).
-- Additif : les formules existantes restent en montant saisi (base_amount_ht NULL).

ALTER TABLE public_pricing_plans
  ADD COLUMN IF NOT EXISTS base_amount_ht INTEGER,
  ADD COLUMN IF NOT EXISTS charges JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Taux de TVA appliqué à toutes les formules (18 % = taux standard UEMOA / Côte d'Ivoire).
ALTER TABLE crm_settings
  ADD COLUMN IF NOT EXISTS pricing_vat_rate NUMERIC(5,2) NOT NULL DEFAULT 18;
