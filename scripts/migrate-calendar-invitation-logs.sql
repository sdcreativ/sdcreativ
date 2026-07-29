-- Journal des envois d'invitations calendrier (email / WhatsApp).
CREATE TABLE IF NOT EXISTS calendar_invitation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  status VARCHAR(20) NOT NULL,
  error TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_invitation_logs_event
  ON calendar_invitation_logs (event_id, sent_at DESC);
