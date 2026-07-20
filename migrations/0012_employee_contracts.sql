-- Contrats employés (Stage, CDD, CDI, Alternance, etc.)

CREATE TABLE IF NOT EXISTS employee_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(32) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES crm_users(id) ON DELETE RESTRICT,
  contract_type VARCHAR(30) NOT NULL
    CHECK (contract_type IN (
      'stage', 'cdd', 'cdi', 'alternance', 'apprentissage', 'freelance', 'prestation'
    )),
  title VARCHAR(200) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'pending_signature', 'signed', 'active', 'ended', 'cancelled'
    )),
  start_date DATE,
  end_date DATE,
  trial_end_date DATE,
  job_title VARCHAR(160),
  department VARCHAR(120),
  work_location VARCHAR(160),
  weekly_hours NUMERIC(5, 2),
  compensation_amount INTEGER,
  compensation_currency VARCHAR(3) NOT NULL DEFAULT 'XOF',
  compensation_period VARCHAR(20) NOT NULL DEFAULT 'monthly'
    CHECK (compensation_period IN ('hourly', 'daily', 'monthly', 'yearly')),
  reminder_days_before INTEGER NOT NULL DEFAULT 30,
  signed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  document_s3_key TEXT,
  document_name TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_contracts_user
  ON employee_contracts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_contracts_status
  ON employee_contracts (status);

CREATE INDEX IF NOT EXISTS idx_employee_contracts_type
  ON employee_contracts (contract_type);

CREATE INDEX IF NOT EXISTS idx_employee_contracts_end_date
  ON employee_contracts (end_date)
  WHERE end_date IS NOT NULL AND status IN ('active', 'signed', 'pending_signature');
