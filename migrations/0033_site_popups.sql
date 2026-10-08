-- Popups de capture (façon Mailchimp, intégrés au CRM) : contenu, ciblage, déclencheurs,
-- fréquence, statistiques, et inscriptions avec code avantage personnel.

CREATE TABLE IF NOT EXISTS site_popups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  locale VARCHAR(5) NOT NULL DEFAULT 'fr',
  layout VARCHAR(10) NOT NULL DEFAULT 'modal',
  variant VARCHAR(10) NOT NULL DEFAULT 'primary',
  eyebrow VARCHAR(80) NOT NULL DEFAULT '',
  title VARCHAR(140) NOT NULL,
  body VARCHAR(600) NOT NULL DEFAULT '',
  offer_label VARCHAR(120) NOT NULL,
  cta_label VARCHAR(60) NOT NULL,
  success_title VARCHAR(140) NOT NULL,
  success_body VARCHAR(600) NOT NULL DEFAULT '',
  consent_text VARCHAR(400) NOT NULL,
  ask_phone BOOLEAN NOT NULL DEFAULT true,
  ask_project BOOLEAN NOT NULL DEFAULT true,
  code_prefix VARCHAR(12) NOT NULL DEFAULT 'SDC',
  code_valid_days SMALLINT NOT NULL DEFAULT 30,
  trigger_delay_seconds SMALLINT,
  trigger_scroll_percent SMALLINT,
  trigger_exit_intent BOOLEAN NOT NULL DEFAULT true,
  show_on_mobile BOOLEAN NOT NULL DEFAULT true,
  audience VARCHAR(12) NOT NULL DEFAULT 'all',
  include_paths TEXT[] NOT NULL DEFAULT '{}',
  exclude_paths TEXT[] NOT NULL DEFAULT '{/devis,/contact,/en/devis,/en/contact}',
  frequency_days SMALLINT NOT NULL DEFAULT 14,
  impressions INTEGER NOT NULL DEFAULT 0,
  closes INTEGER NOT NULL DEFAULT 0,
  signups INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_site_popups_active ON site_popups (is_active, locale, sort_order);

CREATE TABLE IF NOT EXISTS site_popup_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  popup_id UUID REFERENCES site_popups(id) ON DELETE SET NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(40),
  project_type VARCHAR(80),
  offer_label VARCHAR(120) NOT NULL,
  code VARCHAR(40) NOT NULL UNIQUE,
  code_expires_at TIMESTAMPTZ NOT NULL,
  code_used_at TIMESTAMPTZ,
  consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locale VARCHAR(5) NOT NULL DEFAULT 'fr',
  page_path VARCHAR(300),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_site_popup_signups_email ON site_popup_signups (lower(email));
CREATE INDEX IF NOT EXISTS idx_site_popup_signups_created ON site_popup_signups (created_at DESC);

-- Popup FR par défaut, INACTIF : à relire et activer depuis l'admin (Site vitrine → Popups).
INSERT INTO site_popups (
  name, is_active, locale, layout, eyebrow, title, body, offer_label, cta_label,
  success_title, success_body, consent_text, trigger_delay_seconds, trigger_scroll_percent
)
SELECT
  'Avantage exclusif — maintenance offerte', false, 'fr', 'modal', 'Offre réservée',
  'Votre site pro, avec 3 mois de maintenance en plus',
  'En plus de l''hébergement Hostinger à tarif réduit, recevez votre code personnel : 3 mois de maintenance offerts sur votre projet. Valable 30 jours.',
  '3 mois de maintenance offerts', 'Recevoir mon code',
  'Votre code est prêt !',
  'Nous vous l''avons aussi envoyé par e-mail. Présentez-le lors de votre demande de devis.',
  'J''accepte que SD CREATIV utilise mes coordonnées pour m''envoyer mon code et des offres. Désinscription possible à tout moment.',
  30, 50
WHERE NOT EXISTS (SELECT 1 FROM site_popups);
