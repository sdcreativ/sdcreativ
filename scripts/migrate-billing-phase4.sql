-- Phase 4 billing : notifications in-app (admin + portail)
CREATE TABLE IF NOT EXISTS crm_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience VARCHAR(16) NOT NULL CHECK (audience IN ('admin', 'portal')),
  portal_client_id VARCHAR(64),
  category VARCHAR(32) NOT NULL DEFAULT 'billing',
  event_type VARCHAR(64) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  link_href VARCHAR(500),
  entity_type VARCHAR(32),
  entity_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_notifications_admin_unread
  ON crm_notifications (created_at DESC)
  WHERE audience = 'admin' AND read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_notifications_portal
  ON crm_notifications (portal_client_id, created_at DESC)
  WHERE audience = 'portal';
