-- Corps juridique des contrats employés : missions, avantages, clauses, réf. interne

ALTER TABLE employee_contracts
  ADD COLUMN IF NOT EXISTS internal_reference VARCHAR(80),
  ADD COLUMN IF NOT EXISTS missions TEXT,
  ADD COLUMN IF NOT EXISTS benefits JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS clauses JSONB NOT NULL DEFAULT '[]';
