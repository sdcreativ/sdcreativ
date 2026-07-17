import type { QueryResultRow } from "pg";

type DbQuery = (
  text: string,
  params?: unknown[],
) => Promise<{ rows: QueryResultRow[]; rowCount: number | null }>;

export type SyncableQuoteLine = {
  label: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
  catalogItemId?: string;
};

export type SyncableInvoiceLine = {
  label: string;
  amount: number;
};

/** Remplace les lignes relationnelles d’un devis (dual-write avec JSONB). */
export async function syncQuoteLines(
  query: DbQuery,
  quoteId: string,
  lines: SyncableQuoteLine[],
): Promise<void> {
  await query(`DELETE FROM quote_lines WHERE quote_id = $1`, [quoteId]);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    await query(
      `INSERT INTO quote_lines (quote_id, sort_order, label, amount, quantity, unit_price, catalog_item_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        quoteId,
        i,
        line.label,
        line.amount,
        line.quantity ?? null,
        line.unitPrice ?? null,
        line.catalogItemId ?? null,
      ],
    );
  }
}

/** Remplace les lignes relationnelles d’une facture. */
export async function syncInvoiceLines(
  query: DbQuery,
  invoiceId: string,
  lines: SyncableInvoiceLine[],
): Promise<void> {
  await query(`DELETE FROM invoice_lines WHERE invoice_id = $1`, [invoiceId]);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    await query(
      `INSERT INTO invoice_lines (invoice_id, sort_order, label, amount)
       VALUES ($1,$2,$3,$4)`,
      [invoiceId, i, line.label, line.amount],
    );
  }
}
