-- Mention de remise sous l'avantage hébergement + parcours devis enrichi depuis les cartes.

-- Texte modifiable ; {pourcentage} est remplacé par le % de parrainage des réglages.
ALTER TABLE crm_settings
  ADD COLUMN IF NOT EXISTS pricing_referral_note VARCHAR(160) NOT NULL
    DEFAULT '-{pourcentage} % grâce à notre partenariat Hostinger';

-- L'avantage « Hébergement + nom de domaine inclus » (id hosting, migration 0023) devient
-- l'avantage parrainé : lien Hostinger + mention de remise quand elle s'applique.
UPDATE public_pricing_plans
SET perks = (
  SELECT jsonb_agg(CASE WHEN p->>'id' = 'hosting' THEN p || '{"referralLink": true}'::jsonb ELSE p END)
  FROM jsonb_array_elements(perks) p
)
WHERE perks @> '[{"id": "hosting"}]'::jsonb;

-- Pré-sélection du type de projet dans le configurateur (seulement si la destination n'a pas été personnalisée).
UPDATE public_pricing_plans
SET cta_href = CASE WHEN slug = 'business' OR lower(name) = 'business' THEN '/devis?type=e-commerce' ELSE '/devis?type=site-vitrine' END
WHERE locale = 'fr' AND cta_href = '/devis'
  AND (slug IN ('essentiel', 'professionnel', 'business') OR lower(name) IN ('essentiel', 'professionnel', 'business'));
