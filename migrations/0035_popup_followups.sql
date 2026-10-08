-- Popups, étape 2 : relances avant expiration du code, tests A/B, désinscription.

-- Test A/B : les popups actifs partageant la même clé se répartissent les visiteurs.
ALTER TABLE site_popups ADD COLUMN IF NOT EXISTS ab_test_key VARCHAR(40);
-- Relances e-mail J+3 et J+20 tant que le code n'a pas servi.
ALTER TABLE site_popups ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE site_popup_signups ADD COLUMN IF NOT EXISTS reminder_count SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE site_popup_signups ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;
ALTER TABLE site_popup_signups ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_site_popup_signups_reminders
  ON site_popup_signups (code_expires_at) WHERE code_used_at IS NULL AND unsubscribed_at IS NULL;

