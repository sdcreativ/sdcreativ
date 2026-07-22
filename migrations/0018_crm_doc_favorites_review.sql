-- Documentation : revue périodique + favoris utilisateur

ALTER TABLE crm_doc_pages
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

UPDATE crm_doc_pages
SET reviewed_at = COALESCE(reviewed_at, updated_at, created_at)
WHERE status = 'published' AND reviewed_at IS NULL;

CREATE TABLE IF NOT EXISTS crm_doc_favorites (
  user_id UUID NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  page_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, page_slug)
);

CREATE INDEX IF NOT EXISTS idx_crm_doc_favorites_user
  ON crm_doc_favorites (user_id, created_at DESC);
