-- Documentation CRM éditable (CMS interne, pattern blog)

CREATE TABLE IF NOT EXISTS crm_doc_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_doc_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category_slug TEXT NOT NULL REFERENCES crm_doc_categories(slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  summary TEXT NOT NULL DEFAULT '',
  explanation TEXT NOT NULL DEFAULT '',
  how_it_works TEXT NOT NULL DEFAULT '',
  content_html TEXT NOT NULL DEFAULT '',
  href TEXT,
  screenshots TEXT[] NOT NULL DEFAULT '{}',
  is_recent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_doc_pages_category ON crm_doc_pages (category_slug)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_doc_pages_status ON crm_doc_pages (status)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_doc_categories_sort ON crm_doc_categories (sort_order, label);
