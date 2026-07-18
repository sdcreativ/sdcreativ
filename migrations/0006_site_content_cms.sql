-- Contenu site éditable : maintenance, audit gratuit, pages légales

ALTER TABLE crm_settings
  ADD COLUMN IF NOT EXISTS site_maintenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS site_audit JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS site_legal JSONB NOT NULL DEFAULT '{}'::jsonb;
