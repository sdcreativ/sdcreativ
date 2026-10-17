-- Apparence de Kady (assistance virtuelle du site), réglée dans CRM → Site → Kady.
ALTER TABLE crm_settings ADD COLUMN IF NOT EXISTS kady_appearance JSONB NOT NULL DEFAULT '{}';
