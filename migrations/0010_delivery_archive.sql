-- Archivage métier à la livraison (projet livré + devis + factures soldées)

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_projects_archived_at ON projects (archived_at);
CREATE INDEX IF NOT EXISTS idx_projects_source_quote ON projects (source_quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_archived_at ON quotes (archived_at);
CREATE INDEX IF NOT EXISTS idx_quotes_project_id ON quotes (project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_archived_at ON invoices (archived_at);

CREATE TABLE IF NOT EXISTS project_archive_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  s3_key_manifest TEXT NOT NULL,
  s3_key_pdf TEXT,
  sha256 TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_archive_bundles_project
  ON project_archive_bundles (project_id, created_at DESC);
