-- Documentation CRM : révisions + feedback

CREATE TABLE IF NOT EXISTS crm_doc_page_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES crm_doc_pages(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  created_by_name TEXT,
  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_doc_page_revisions_page
  ON crm_doc_page_revisions (page_id, created_at DESC);

CREATE TABLE IF NOT EXISTS crm_doc_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug TEXT NOT NULL,
  page_id UUID REFERENCES crm_doc_pages(id) ON DELETE SET NULL,
  user_id UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  user_name TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('helpful', 'error')),
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_doc_feedback_slug
  ON crm_doc_feedback (page_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_doc_feedback_kind
  ON crm_doc_feedback (kind, created_at DESC);
