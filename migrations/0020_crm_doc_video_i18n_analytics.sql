-- Documentation CRM : vidéo Loom, i18n EN, analytics vues, checklist onboarding

ALTER TABLE crm_doc_pages
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS title_en TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS summary_en TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS explanation_en TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS how_it_works_en TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS content_html_en TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS crm_doc_onboarding_progress (
  user_id UUID NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_doc_pages_view_count
  ON crm_doc_pages (view_count DESC)
  WHERE deleted_at IS NULL AND status = 'published';
