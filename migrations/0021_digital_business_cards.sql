-- Cartes de visite virtuelles. Additive : aucune table existante n'est modifiée.
-- Une carte par compte CRM. Le nom, l'e-mail, le téléphone et la photo restent sur crm_users.

CREATE TABLE IF NOT EXISTS digital_business_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES crm_users(id) ON DELETE CASCADE,
  public_token VARCHAR(64) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  indexable BOOLEAN NOT NULL DEFAULT false,
  job_title VARCHAR(200) NOT NULL DEFAULT '',
  department VARCHAR(120) NOT NULL DEFAULT '',
  company VARCHAR(120) NOT NULL DEFAULT 'SD CREATIV',
  whatsapp VARCHAR(32) NOT NULL DEFAULT '',
  website VARCHAR(300) NOT NULL DEFAULT '',
  linkedin VARCHAR(300) NOT NULL DEFAULT '',
  github VARCHAR(300) NOT NULL DEFAULT '',
  instagram VARCHAR(300) NOT NULL DEFAULT '',
  twitter VARCHAR(300) NOT NULL DEFAULT '',
  location VARCHAR(160) NOT NULL DEFAULT '',
  languages VARCHAR(200) NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  skills TEXT NOT NULL DEFAULT '',
  services TEXT NOT NULL DEFAULT '',
  show_phone BOOLEAN NOT NULL DEFAULT false,
  show_whatsapp BOOLEAN NOT NULL DEFAULT false,
  show_email BOOLEAN NOT NULL DEFAULT true,
  show_website BOOLEAN NOT NULL DEFAULT true,
  show_linkedin BOOLEAN NOT NULL DEFAULT false,
  show_github BOOLEAN NOT NULL DEFAULT false,
  show_instagram BOOLEAN NOT NULL DEFAULT false,
  show_twitter BOOLEAN NOT NULL DEFAULT false,
  show_location BOOLEAN NOT NULL DEFAULT false,
  show_bio BOOLEAN NOT NULL DEFAULT true,
  show_skills BOOLEAN NOT NULL DEFAULT true,
  show_services BOOLEAN NOT NULL DEFAULT true,
  show_photo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digital_business_cards_active
  ON digital_business_cards (active);

CREATE TABLE IF NOT EXISTS business_card_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_card_id UUID NOT NULL REFERENCES digital_business_cards(id) ON DELETE CASCADE,
  device_type VARCHAR(16) NOT NULL DEFAULT 'unknown',
  country VARCHAR(2),
  referrer VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_card_views_card_created
  ON business_card_views (business_card_id, created_at DESC);
