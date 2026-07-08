-- Réparation schéma CRM — à exécuter si le login /admin renvoie « Erreur serveur »
-- Cause : calendar_oauth_connections était créé avant crm_users lors de l'init PostgreSQL.
--
-- Usage VPS :
--   docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod \
--     exec -T postgres psql -U sdcreativ -d sdcreativ -f - < scripts/db-repair-crm-schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS crm_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(160) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'commercial',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_users_role ON crm_users (role);
CREATE INDEX IF NOT EXISTS idx_crm_users_active ON crm_users (active);

CREATE TABLE IF NOT EXISTS crm_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_roles_slug ON crm_roles (slug);

ALTER TABLE crm_users ALTER COLUMN role TYPE VARCHAR(50);
ALTER TABLE crm_users ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}';
ALTER TABLE crm_users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64);
ALTER TABLE crm_users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE crm_users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE crm_users ADD COLUMN IF NOT EXISTS invite_token_hash VARCHAR(64);
ALTER TABLE crm_users ADD COLUMN IF NOT EXISTS invite_token_expires_at TIMESTAMPTZ;
ALTER TABLE crm_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_crm_users_invite_token ON crm_users (invite_token_hash)
  WHERE invite_token_hash IS NOT NULL;

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

CREATE TABLE IF NOT EXISTS crm_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  branding JSONB NOT NULL DEFAULT '{}',
  email_templates JSONB NOT NULL DEFAULT '{}',
  security JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_settings ADD COLUMN IF NOT EXISTS security JSONB NOT NULL DEFAULT '{}';
ALTER TABLE crm_settings ADD COLUMN IF NOT EXISTS site_public JSONB NOT NULL DEFAULT '{}';

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
