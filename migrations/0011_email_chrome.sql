-- Pied / en-tête emails (logo + infos société) — réglages CRM
ALTER TABLE crm_settings
  ADD COLUMN IF NOT EXISTS email_chrome JSONB NOT NULL DEFAULT '{}';
