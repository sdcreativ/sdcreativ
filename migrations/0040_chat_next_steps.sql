-- Suites données à une conversation avec l'assistante : rendez-vous réservé (Cal.com) et passage sur WhatsApp.
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS booked_at TIMESTAMPTZ;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS booking_start TIMESTAMPTZ;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS whatsapp_clicked_at TIMESTAMPTZ;
