-- Schéma CRM — leads
-- Usage : psql -U user -d sdcreativ -f scripts/db-init.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  company VARCHAR(160),
  source VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'new',
  service VARCHAR(100),
  budget VARCHAR(50),
  timeline VARCHAR(50),
  message TEXT,
  estimated_value INTEGER,
  assignee VARCHAR(100),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads (source);
CREATE INDEX IF NOT EXISTS idx_leads_assignee ON leads (assignee);

CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL DEFAULT 'note',
  subject VARCHAR(200),
  content TEXT NOT NULL,
  actor_name VARCHAR(160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities (lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  company VARCHAR(160),
  address TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  portal_client_id VARCHAR(64),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  notes TEXT,
  account_manager VARCHAR(100),
  sector VARCHAR(100),
  tags TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_email ON clients (email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients (status);
CREATE INDEX IF NOT EXISTS idx_clients_portal ON clients (portal_client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_lead_id ON clients (lead_id) WHERE lead_id IS NOT NULL;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS account_manager VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sector VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_access_token_hash TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_access_created_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_access_last_sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_clients_portal_access_hash
  ON clients (portal_access_token_hash)
  WHERE portal_access_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_account_manager ON clients (account_manager);
CREATE INDEX IF NOT EXISTS idx_clients_sector ON clients (sector);
CREATE INDEX IF NOT EXISTS idx_clients_tags ON clients USING GIN (tags);

CREATE TABLE IF NOT EXISTS client_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL DEFAULT 'note',
  subject VARCHAR(200),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_interactions_client ON client_interactions (client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'site_vitrine',
  status VARCHAR(30) NOT NULL DEFAULT 'discovery',
  progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date DATE,
  due_date DATE,
  budget INTEGER,
  description TEXT,
  assignee VARCHAR(100),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_client ON projects (client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_due_date ON projects (due_date);

CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label VARCHAR(200) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming',
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON project_milestones (project_id, sort_order);

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(24) NOT NULL UNIQUE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  company VARCHAR(160),
  project_type_id VARCHAR(50),
  project_label VARCHAR(200) NOT NULL,
  page_tier_id VARCHAR(50),
  addon_ids JSONB NOT NULL DEFAULT '[]',
  lines JSONB NOT NULL DEFAULT '[]',
  subtotal INTEGER NOT NULL DEFAULT 0,
  estimate_min INTEGER,
  estimate_max INTEGER,
  budget VARCHAR(50),
  timeline VARCHAR(50),
  message TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ,
  follow_up_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes (status);
CREATE INDEX IF NOT EXISTS idx_quotes_email ON quotes (email);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_lead_id ON quotes (lead_id) WHERE lead_id IS NOT NULL;

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES crm_users(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(20);

CREATE TABLE IF NOT EXISTS billing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  kind VARCHAR(40) NOT NULL CHECK (kind IN (
    'quote_pdf', 'signed_quote_pdf', 'invoice_pdf', 'signature_proof'
  )),
  s3_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  sha256 TEXT NOT NULL,
  file_size BIGINT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_documents_quote ON billing_documents (quote_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_documents_invoice ON billing_documents (invoice_id, created_at DESC);

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('quote', 'invoice')),
  entity_id UUID NOT NULL,
  action VARCHAR(80) NOT NULL,
  actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('admin', 'client', 'system')),
  actor_id TEXT,
  actor_name TEXT,
  from_status VARCHAR(30),
  to_status VARCHAR(30),
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_entity ON billing_events (entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS quote_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL UNIQUE REFERENCES quotes(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signature_data TEXT NOT NULL,
  signature_hash TEXT NOT NULL,
  ip_address VARCHAR(64),
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  proof_document_id UUID REFERENCES billing_documents(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_quote_signatures_quote ON quote_signatures (quote_id);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'todo',
  priority VARCHAR(10) NOT NULL DEFAULT 'medium',
  due_date DATE,
  assignee VARCHAR(100),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks (assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks (project_id);

CREATE TABLE IF NOT EXISTS task_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_subtasks_task ON task_subtasks (task_id, sort_order);

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  actor_name VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments (task_id, created_at DESC);

CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  filename VARCHAR(160) NOT NULL,
  s3_key VARCHAR(512) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  size_bytes INT NOT NULL DEFAULT 0,
  uploaded_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments (task_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(24) NOT NULL UNIQUE,
  subject VARCHAR(200) NOT NULL,
  category VARCHAR(30) NOT NULL DEFAULT 'technical',
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  priority VARCHAR(10) NOT NULL DEFAULT 'normal',
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  portal_client_id VARCHAR(64),
  client_name VARCHAR(160) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  assignee VARCHAR(100),
  sla_due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON support_tickets (priority);
CREATE INDEX IF NOT EXISTS idx_tickets_portal ON support_tickets (portal_client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON support_tickets (created_at DESC);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_type VARCHAR(10) NOT NULL DEFAULT 'staff',
  author_name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages (ticket_id, created_at ASC);

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  type VARCHAR(30) NOT NULL DEFAULT 'meeting',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT false,
  assignee VARCHAR(100),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_starts ON calendar_events (starts_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_assignee ON calendar_events (assignee);

CREATE TABLE IF NOT EXISTS crm_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(160) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'commercial',
  active BOOLEAN NOT NULL DEFAULT true,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_users_role ON crm_users (role);
CREATE INDEX IF NOT EXISTS idx_crm_users_active ON crm_users (active);

CREATE TABLE IF NOT EXISTS calendar_oauth_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'microsoft')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  calendar_id VARCHAR(255) NOT NULL DEFAULT 'primary',
  sync_token TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_calendar_oauth_user ON calendar_oauth_connections (user_id);

CREATE TABLE IF NOT EXISTS calendar_event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(160),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_participants_event ON calendar_event_participants (event_id);

CREATE TABLE IF NOT EXISTS crm_reminder_logs (
  reminder_key VARCHAR(160) PRIMARY KEY,
  item_id VARCHAR(64) NOT NULL,
  item_type VARCHAR(30) NOT NULL,
  title VARCHAR(200) NOT NULL,
  trigger_at TIMESTAMPTZ NOT NULL,
  channels JSONB NOT NULL DEFAULT '["in_app"]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_reminder_logs_trigger ON crm_reminder_logs (trigger_at DESC);

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

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(24) NOT NULL UNIQUE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(160),
  lines JSONB NOT NULL DEFAULT '[]',
  subtotal INTEGER NOT NULL DEFAULT 0,
  tva_rate NUMERIC(5,2) NOT NULL DEFAULT 18,
  tva_amount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  due_date DATE,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices (due_date);

CREATE TABLE IF NOT EXISTS crm_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  branding JSONB NOT NULL DEFAULT '{}',
  email_templates JSONB NOT NULL DEFAULT '{}',
  security JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_settings ADD COLUMN IF NOT EXISTS security JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS crm_login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(160),
  ip_address VARCHAR(64),
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_login_logs_created ON crm_login_logs (created_at DESC);

ALTER TABLE crm_users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64);
ALTER TABLE crm_users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE crm_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_clients_updated_at ON clients (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes (status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks (assignee, status);

CREATE TABLE IF NOT EXISTS crm_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id VARCHAR(64),
  actor_name VARCHAR(160) NOT NULL,
  actor_email VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(64),
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_audit_logs_created ON crm_audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(200) NOT NULL UNIQUE,
  title VARCHAR(300) NOT NULL,
  excerpt TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  read_time VARCHAR(20) NOT NULL DEFAULT '5 min',
  content JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  cover_image VARCHAR(512),
  author_name VARCHAR(160),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts (status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_date ON blog_posts (date DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts (slug);

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS content_html TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_title VARCHAR(300);
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled ON blog_posts (scheduled_at)
  WHERE status = 'scheduled';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_blog_posts_deleted ON blog_posts (deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  role VARCHAR(300) NOT NULL,
  missions TEXT NOT NULL,
  initials VARCHAR(8) NOT NULL,
  image VARCHAR(512) NOT NULL,
  image_alt VARCHAR(300) NOT NULL,
  image_position VARCHAR(20) NOT NULL DEFAULT '50% 0%',
  locale VARCHAR(5) NOT NULL DEFAULT 'fr',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_team_members_locale_sort
  ON public_team_members (locale, sort_order);
CREATE INDEX IF NOT EXISTS idx_public_team_members_visible
  ON public_team_members (locale, sort_order)
  WHERE is_visible = true;

CREATE TABLE IF NOT EXISTS public_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) NOT NULL UNIQUE,
  quote TEXT NOT NULL,
  author VARCHAR(160) NOT NULL,
  role VARCHAR(160) NOT NULL,
  company VARCHAR(200) NOT NULL,
  locale VARCHAR(5) NOT NULL DEFAULT 'fr',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_testimonials_locale_sort
  ON public_testimonials (locale, sort_order);
CREATE INDEX IF NOT EXISTS idx_public_testimonials_visible
  ON public_testimonials (locale, sort_order)
  WHERE is_visible = true;

CREATE TABLE IF NOT EXISTS public_faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) NOT NULL UNIQUE,
  question VARCHAR(300) NOT NULL,
  answer TEXT NOT NULL,
  locale VARCHAR(5) NOT NULL DEFAULT 'fr',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_faq_items_locale_sort
  ON public_faq_items (locale, sort_order);
CREATE INDEX IF NOT EXISTS idx_public_faq_items_visible
  ON public_faq_items (locale, sort_order)
  WHERE is_visible = true;

ALTER TABLE crm_settings ADD COLUMN IF NOT EXISTS site_hero JSONB NOT NULL DEFAULT '{}';
ALTER TABLE crm_settings ADD COLUMN IF NOT EXISTS site_quote_config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE crm_settings ADD COLUMN IF NOT EXISTS site_why_us JSONB NOT NULL DEFAULT '{}';
ALTER TABLE crm_settings ADD COLUMN IF NOT EXISTS site_method JSONB NOT NULL DEFAULT '{}';
ALTER TABLE crm_settings ADD COLUMN IF NOT EXISTS site_page_heroes JSONB NOT NULL DEFAULT '{}';
ALTER TABLE crm_settings ADD COLUMN IF NOT EXISTS site_solutions_ia JSONB NOT NULL DEFAULT '{}';
ALTER TABLE crm_settings ADD COLUMN IF NOT EXISTS site_careers JSONB NOT NULL DEFAULT '{}';
ALTER TABLE crm_settings ADD COLUMN IF NOT EXISTS site_maintenance JSONB NOT NULL DEFAULT '{}';
ALTER TABLE crm_settings ADD COLUMN IF NOT EXISTS site_audit JSONB NOT NULL DEFAULT '{}';
ALTER TABLE crm_settings ADD COLUMN IF NOT EXISTS site_legal JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) NOT NULL UNIQUE,
  icon VARCHAR(80) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  features TEXT[] NOT NULL DEFAULT '{}',
  image VARCHAR(512),
  image_alt VARCHAR(300),
  detail_href VARCHAR(200),
  detail_label VARCHAR(120),
  detail JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_services_sort ON public_services (sort_order);
CREATE INDEX IF NOT EXISTS idx_public_services_visible ON public_services (sort_order) WHERE is_visible = true;

CREATE TABLE IF NOT EXISTS public_job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  type VARCHAR(80) NOT NULL,
  location VARCHAR(160) NOT NULL,
  department VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  missions TEXT[] NOT NULL DEFAULT '{}',
  profile TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_job_offers_sort ON public_job_offers (sort_order);
CREATE INDEX IF NOT EXISTS idx_public_job_offers_visible ON public_job_offers (sort_order) WHERE is_visible = true;

CREATE TABLE IF NOT EXISTS public_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  locale VARCHAR(5) NOT NULL DEFAULT 'fr',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_partners_locale_sort ON public_partners (locale, sort_order);

CREATE TABLE IF NOT EXISTS public_pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  tagline VARCHAR(120) NOT NULL,
  price_from INTEGER,
  price_note VARCHAR(120),
  features TEXT[] NOT NULL DEFAULT '{}',
  highlighted BOOLEAN NOT NULL DEFAULT false,
  variant VARCHAR(10) NOT NULL DEFAULT 'primary',
  locale VARCHAR(5) NOT NULL DEFAULT 'fr',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_pricing_plans_locale_sort ON public_pricing_plans (locale, sort_order);

CREATE TABLE IF NOT EXISTS public_pricing_reassurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(80) NOT NULL,
  description VARCHAR(200) NOT NULL,
  locale VARCHAR(5) NOT NULL DEFAULT 'fr',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_pricing_reassurance_locale_sort ON public_pricing_reassurance (locale, sort_order);

CREATE TABLE IF NOT EXISTS public_realisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  client VARCHAR(160) NOT NULL,
  sector VARCHAR(120) NOT NULL,
  location VARCHAR(160) NOT NULL,
  year VARCHAR(10) NOT NULL,
  duration VARCHAR(40) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  stack TEXT[] NOT NULL DEFAULT '{}',
  image VARCHAR(512) NOT NULL,
  image_alt VARCHAR(300) NOT NULL,
  accent VARCHAR(20) NOT NULL DEFAULT '#0072B5',
  metric_value VARCHAR(40),
  metric_label VARCHAR(120),
  featured BOOLEAN NOT NULL DEFAULT false,
  case_study JSONB NOT NULL DEFAULT '{}',
  testimonial JSONB,
  before_after JSONB,
  locale VARCHAR(5) NOT NULL DEFAULT 'fr',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_realisations_locale_sort ON public_realisations (locale, sort_order);
CREATE INDEX IF NOT EXISTS idx_public_realisations_visible ON public_realisations (locale, sort_order) WHERE is_visible = true;
