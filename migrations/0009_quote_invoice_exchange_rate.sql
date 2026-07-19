-- Taux de change figé devis / factures (1 unité devise = N XOF)
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS exchange_rate_to_xof NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS exchange_rate_at TIMESTAMPTZ;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS exchange_rate_to_xof NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS exchange_rate_at TIMESTAMPTZ;
