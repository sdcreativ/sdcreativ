-- Contenu site éditable : page Formations

ALTER TABLE crm_settings
  ADD COLUMN IF NOT EXISTS site_formations JSONB NOT NULL DEFAULT '{}'::jsonb;
