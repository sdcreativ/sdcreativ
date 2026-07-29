-- Journal invitations : message_id Resend + statuts delivery
ALTER TABLE calendar_invitation_logs
  ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_calendar_invitation_logs_provider_msg
  ON calendar_invitation_logs (provider_message_id)
  WHERE provider_message_id IS NOT NULL;
