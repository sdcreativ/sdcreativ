-- Formules tarifaires : prix affichable (mode, devise, mention fiscale), badge,
-- avantages inclus (perks), bouton d'action — tout éditable depuis /admin/crm/site/tarifs.
-- Additif uniquement : aucune table ni donnée existante n'est supprimée.

ALTER TABLE public_pricing_plans
  ADD COLUMN IF NOT EXISTS price_mode VARCHAR(10) NOT NULL DEFAULT 'quote',
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) NOT NULL DEFAULT 'XOF',
  ADD COLUMN IF NOT EXISTS currency_label VARCHAR(20) NOT NULL DEFAULT 'FCFA',
  ADD COLUMN IF NOT EXISTS tax_mention VARCHAR(4) NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS badge_label VARCHAR(40),
  ADD COLUMN IF NOT EXISTS perks JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cta_label VARCHAR(60),
  ADD COLUMN IF NOT EXISTS cta_href VARCHAR(300);

-- Conserve le rendu actuel des enregistrements existants (badge + bouton devis).
UPDATE public_pricing_plans
SET badge_label = CASE WHEN locale = 'en' THEN 'Popular' ELSE 'Populaire' END
WHERE highlighted = true AND (badge_label IS NULL OR badge_label = '');

UPDATE public_pricing_plans
SET cta_label = CASE WHEN locale = 'en' THEN 'Get a quote' ELSE 'Demander un devis' END
WHERE cta_label IS NULL OR cta_label = '';

UPDATE public_pricing_plans
SET cta_href = CASE WHEN locale = 'en' THEN '/en/devis' ELSE '/devis' END
WHERE cta_href IS NULL OR cta_href = '';

-- Contenu FR initial (maquette) : mise à jour ciblée des 3 formules FR existantes,
-- identifiants conservés, aucune insertion, enregistrements EN non touchés.
UPDATE public_pricing_plans p
SET name = v.name,
    tagline = v.tagline,
    price_mode = v.price_mode,
    price_from = v.price_amount,
    price_note = NULL,
    currency_code = 'XOF',
    currency_label = 'FCFA',
    tax_mention = 'ttc',
    variant = v.variant,
    highlighted = v.highlighted,
    badge_label = v.badge_label,
    features = v.features,
    perks = '[
      {"id":"hosting","title":"Hébergement + nom de domaine inclus","detail":"Pendant 1 an","icon":"Server","isVisible":true},
      {"id":"maintenance","title":"Maintenance gratuite pendant 1 an","detail":"Payante à partir de la deuxième année","icon":"Settings","isVisible":true}
    ]'::jsonb,
    updated_at = NOW()
FROM (VALUES
  ('essentiel', 'Essentiel', 'Pour démarrer.', 'from', 287000, 'primary', false, NULL,
    ARRAY['Développé avec WordPress', 'Développement sur mesure', 'Site vitrine professionnel (jusqu''à 5 pages)',
          'Design responsive', 'Formulaire de contact', 'SEO initial']::text[]),
  ('professionnel', 'Professionnel', 'Pour accélérer.', 'fixed', 450000, 'primary', true, 'Populaire',
    ARRAY['Développé avec WordPress', 'Développement sur mesure', 'Plus de pages & sections', 'Galerie & portfolio',
          'Module blog', 'Sécurité renforcée', 'Optimisation SEO avancée', 'Support prioritaire 3 mois']::text[]),
  ('business', 'Business', 'Pour vendre.', 'fixed', 790000, 'accent', false, NULL,
    ARRAY['Développé avec WordPress', 'Développement sur mesure', 'Boutique e-commerce complète', 'Catalogue produits',
          'Paiement en ligne (Mobile Money, carte)', 'Gestion des commandes', 'Accompagnement dédié',
          'Formation administration']::text[])
) AS v(slug, name, tagline, price_mode, price_amount, variant, highlighted, badge_label, features)
WHERE p.locale = 'fr' AND (p.slug = v.slug OR lower(p.name) = v.slug);
