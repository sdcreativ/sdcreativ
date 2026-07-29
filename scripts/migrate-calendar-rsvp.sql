-- RSVP calendrier : téléphone + horodatage de réponse (idempotent)
ALTER TABLE calendar_event_participants
  ADD COLUMN IF NOT EXISTS phone VARCHAR(32);

ALTER TABLE calendar_event_participants
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
