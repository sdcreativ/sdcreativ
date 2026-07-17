-- Priority 2 : tables relationnelles, lignes devis/factures, CHECK statuts

-- Équipe projet
CREATE TABLE IF NOT EXISTS project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  role VARCHAR(40) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_project_team_project ON project_team_members (project_id);

-- Échéancier paiements projet
CREATE TABLE IF NOT EXISTS project_payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label VARCHAR(200) NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  due_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_payment_milestones_project
  ON project_payment_milestones (project_id, sort_order);

-- Lignes devis / factures (requêtables ; JSONB conservé pour PDF)
CREATE TABLE IF NOT EXISTS quote_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  label VARCHAR(300) NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  quantity NUMERIC(12, 2),
  unit_price INTEGER,
  catalog_item_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quote_lines_quote ON quote_lines (quote_id, sort_order);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  label VARCHAR(300) NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines (invoice_id, sort_order);

-- Backfill lignes depuis JSONB
INSERT INTO quote_lines (quote_id, sort_order, label, amount, quantity, unit_price, catalog_item_id)
SELECT
  q.id,
  (ord.ordinality - 1)::int,
  COALESCE(NULLIF(TRIM(elem->>'label'), ''), 'Ligne'),
  COALESCE((elem->>'amount')::int, 0),
  NULLIF(elem->>'quantity', '')::numeric,
  NULLIF(elem->>'unitPrice', '')::int,
  NULLIF(elem->>'catalogItemId', '')::uuid
FROM quotes q
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(q.lines, '[]'::jsonb)) WITH ORDINALITY AS ord(elem, ordinality)
WHERE NOT EXISTS (SELECT 1 FROM quote_lines ql WHERE ql.quote_id = q.id);

INSERT INTO invoice_lines (invoice_id, sort_order, label, amount)
SELECT
  i.id,
  (ord.ordinality - 1)::int,
  COALESCE(NULLIF(TRIM(elem->>'label'), ''), 'Ligne'),
  COALESCE((elem->>'amount')::int, 0)
FROM invoices i
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(i.lines, '[]'::jsonb)) WITH ORDINALITY AS ord(elem, ordinality)
WHERE NOT EXISTS (SELECT 1 FROM invoice_lines il WHERE il.invoice_id = i.id);

-- Backfill équipe depuis metadata.teamMembers (match par nom)
INSERT INTO project_team_members (project_id, user_id, role)
SELECT DISTINCT p.id, u.id, 'member'
FROM projects p
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(p.metadata->'teamMembers', '[]'::jsonb)) AS tm(name)
JOIN crm_users u ON u.name = tm.name AND u.active = true
WHERE NOT EXISTS (
  SELECT 1 FROM project_team_members ptm
  WHERE ptm.project_id = p.id AND ptm.user_id = u.id
);

-- Backfill échéancier depuis metadata.paymentSchedule
INSERT INTO project_payment_milestones (project_id, label, amount, status, due_date, sort_order)
SELECT
  p.id,
  COALESCE(NULLIF(TRIM(elem->>'label'), ''), 'Échéance'),
  COALESCE((elem->>'amount')::int, 0),
  COALESCE(NULLIF(TRIM(elem->>'status'), ''), 'pending'),
  NULLIF(elem->>'date', '')::date,
  (ord.ordinality - 1)::int
FROM projects p
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.metadata->'paymentSchedule', '[]'::jsonb)) WITH ORDINALITY AS ord(elem, ordinality)
WHERE NOT EXISTS (
  SELECT 1 FROM project_payment_milestones ppm WHERE ppm.project_id = p.id
);

-- Contraintes CHECK statut (après normalisation soft des valeurs invalides)
UPDATE leads SET status = 'new' WHERE status IS NULL OR status NOT IN ('new','contacted','quote_sent','signed','lost');
UPDATE clients SET status = 'active' WHERE status IS NULL OR status NOT IN ('active','prospect','inactive');
UPDATE projects SET status = 'discovery' WHERE status IS NULL OR status NOT IN ('discovery','design','development','testing','delivered','on_hold','cancelled');
UPDATE tasks SET status = 'todo' WHERE status IS NULL OR status NOT IN ('todo','in_progress','done');
UPDATE support_tickets SET status = 'open' WHERE status IS NULL OR status NOT IN ('open','in_progress','waiting_client','resolved','closed');
UPDATE quotes SET status = 'draft' WHERE status IS NULL OR status NOT IN ('draft','sent','viewed','follow_up','negotiation','signed','validated','accepted','invoiced','rejected','expired');
UPDATE invoices SET status = 'draft' WHERE status IS NULL OR status NOT IN ('draft','sent','paid','overdue','cancelled');
UPDATE vendor_purchase_orders SET status = 'draft' WHERE status IS NULL OR status NOT IN ('draft','sent','accepted','paid','cancelled');
UPDATE project_payment_milestones SET status = 'pending' WHERE status IS NULL OR status NOT IN ('pending','due','paid','overdue');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_status_check') THEN
    ALTER TABLE leads ADD CONSTRAINT leads_status_check
      CHECK (status IN ('new','contacted','quote_sent','signed','lost'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_status_check') THEN
    ALTER TABLE clients ADD CONSTRAINT clients_status_check
      CHECK (status IN ('active','prospect','inactive'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_status_check') THEN
    ALTER TABLE projects ADD CONSTRAINT projects_status_check
      CHECK (status IN ('discovery','design','development','testing','delivered','on_hold','cancelled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_status_check') THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
      CHECK (status IN ('todo','in_progress','done'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_status_check') THEN
    ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_status_check
      CHECK (status IN ('open','in_progress','waiting_client','resolved','closed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_status_check') THEN
    ALTER TABLE quotes ADD CONSTRAINT quotes_status_check
      CHECK (status IN ('draft','sent','viewed','follow_up','negotiation','signed','validated','accepted','invoiced','rejected','expired'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_status_check') THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
      CHECK (status IN ('draft','sent','paid','overdue','cancelled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_po_status_check') THEN
    ALTER TABLE vendor_purchase_orders ADD CONSTRAINT vendor_po_status_check
      CHECK (status IN ('draft','sent','accepted','paid','cancelled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ppm_status_check') THEN
    ALTER TABLE project_payment_milestones ADD CONSTRAINT ppm_status_check
      CHECK (status IN ('pending','due','paid','overdue'));
  END IF;
END $$;
