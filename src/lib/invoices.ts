import { z } from "zod";
import type { QueryResultRow } from "pg";
import { withDb } from "@/lib/db";
import { getQuoteById } from "@/lib/quotes";
import type { InvoiceStatus } from "@/content/invoices-labels";
import { INVOICE_STATUSES } from "@/content/invoices-labels";
import {
  normalizeCurrency,
  resolveExchangeRateToXof,
  SUPPORTED_CURRENCIES,
} from "@/lib/currencies";

export type InvoiceLine = {
  label: string;
  amount: number;
};

export type Invoice = {
  id: string;
  reference: string;
  clientId: string | null;
  projectId: string | null;
  quoteId: string | null;
  clientName: string | null;
  name: string;
  email: string;
  company: string | null;
  lines: InvoiceLine[];
  subtotal: number;
  tvaRate: number;
  tvaAmount: number;
  total: number;
  paidAmount: number;
  status: InvoiceStatus;
  dueDate: string | null;
  sentAt: string | null;
  paidAt: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  currency: string;
  exchangeRateToXof: number | null;
  exchangeRateAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type InvoiceRow = {
  id: string;
  reference: string;
  client_id: string | null;
  project_id: string | null;
  quote_id: string | null;
  client_name: string | null;
  name: string;
  email: string;
  company: string | null;
  lines: InvoiceLine[] | null;
  subtotal: number;
  tva_rate: string | number;
  tva_amount: number;
  total: number;
  paid_amount: number;
  status: InvoiceStatus;
  due_date: Date | null;
  sent_at: Date | null;
  paid_at: Date | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  currency?: string | null;
  exchange_rate_to_xof?: string | number | null;
  exchange_rate_at?: Date | null;
  archived_at?: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    reference: row.reference,
    clientId: row.client_id,
    projectId: row.project_id,
    quoteId: row.quote_id,
    clientName: row.client_name,
    name: row.name,
    email: row.email,
    company: row.company,
    lines: row.lines ?? [],
    subtotal: row.subtotal,
    tvaRate: Number(row.tva_rate),
    tvaAmount: row.tva_amount,
    total: row.total,
    paidAmount: row.paid_amount,
    status: row.status,
    dueDate: row.due_date?.toISOString().slice(0, 10) ?? null,
    sentAt: row.sent_at?.toISOString() ?? null,
    paidAt: row.paid_at?.toISOString() ?? null,
    notes: row.notes,
    metadata: row.metadata ?? {},
    currency: row.currency ?? "XOF",
    exchangeRateToXof:
      row.exchange_rate_to_xof != null ? Number(row.exchange_rate_to_xof) : null,
    exchangeRateAt: row.exchange_rate_at?.toISOString() ?? null,
    archivedAt: row.archived_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function computeTotals(subtotal: number, tvaRate: number) {
  const tvaAmount = Math.round(subtotal * (tvaRate / 100));
  return { tvaAmount, total: subtotal + tvaAmount };
}

async function nextReference(
  query: (text: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[]; rowCount: number | null }>,
): Promise<string> {
  const year = new Date().getFullYear();
  const { rows } = await query(
    `SELECT COUNT(*)::text AS count FROM invoices WHERE EXTRACT(YEAR FROM created_at) = $1`,
    [year],
  );
  const seq = String(Number((rows[0] as { count: string })?.count ?? 0) + 1).padStart(4, "0");
  return `FAC-${year}-${seq}`;
}

const lineSchema = z.object({
  label: z.string().trim().min(1).max(200),
  amount: z.number().int().min(0),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  quoteId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(255),
  company: z.string().trim().max(160).optional().nullable(),
  lines: z.array(lineSchema).min(1),
  tvaRate: z.number().min(0).max(100).default(18),
  status: z.enum(INVOICE_STATUSES).default("draft"),
  dueDate: z.string().trim().optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  exchangeRateToXof: z.number().positive().optional().nullable(),
});

export const updateInvoiceSchema = z.object({
  status: z.enum(INVOICE_STATUSES).optional(),
  paidAmount: z.number().int().min(0).optional(),
  dueDate: z.string().trim().optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  lines: z.array(lineSchema).optional(),
  tvaRate: z.number().min(0).max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const listSelect = `
  SELECT i.*, c.company AS client_name
  FROM invoices i
  LEFT JOIN clients c ON c.id = i.client_id
`;

export async function listInvoices(options?: {
  archived?: boolean | "all";
}): Promise<Invoice[]> {
  return withDb(async (query) => {
    await syncOverdueInvoices(query);
    const archived = options?.archived;
    let where = "";
    if (archived === true) where = "WHERE i.archived_at IS NOT NULL";
    else if (archived !== "all") where = "WHERE i.archived_at IS NULL";
    const { rows } = await query<InvoiceRow>(
      `${listSelect} ${where} ORDER BY i.created_at DESC`,
    );
    return rows.map(mapInvoice);
  });
}

/** Passe en « overdue » les factures envoyées dont l'échéance est dépassée. */
export async function syncOverdueInvoices(
  query?: (text: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[]; rowCount: number | null }>,
): Promise<number> {
  const run = query ?? (async (text: string, params?: unknown[]) => {
    return withDb(async (q) => q(text, params));
  });

  const { rowCount } = await run(
    `UPDATE invoices SET status = 'overdue', updated_at = NOW()
     WHERE status = 'sent'
       AND due_date IS NOT NULL
       AND due_date < CURRENT_DATE
       AND paid_amount < total`,
  );
  return rowCount ?? 0;
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  return withDb(async (query) => {
    const { rows } = await query<InvoiceRow>(`${listSelect} WHERE i.id = $1`, [id]);
    return rows[0] ? mapInvoice(rows[0]) : null;
  });
}

export async function getInvoiceByCinetPayTransactionId(
  transactionId: string,
): Promise<Invoice | null> {
  return withDb(async (query) => {
    const { rows } = await query<InvoiceRow>(
      `${listSelect}
       WHERE i.metadata->'cinetpayPending'->>'transactionId' = $1
          OR i.metadata->'cinetpayProcessedTransactions' @> to_jsonb(ARRAY[$1]::text[])
       LIMIT 1`,
      [transactionId],
    );
    return rows[0] ? mapInvoice(rows[0]) : null;
  });
}

export async function getInvoiceByQuoteId(quoteId: string): Promise<Invoice | null> {
  return withDb(async (query) => {
    const { rows } = await query<InvoiceRow>(
      `${listSelect} WHERE i.quote_id = $1 ORDER BY i.created_at DESC LIMIT 1`,
      [quoteId],
    );
    return rows[0] ? mapInvoice(rows[0]) : null;
  });
}

export async function listInvoicesForPortalClient(portalClientId: string): Promise<Invoice[]> {
  return withDb(async (query) => {
    await syncOverdueInvoices(query);
    const { rows } = await query<InvoiceRow>(
      `SELECT i.*, c.company AS client_name
       FROM invoices i
       INNER JOIN clients c ON c.id = i.client_id
       WHERE c.portal_client_id = $1
         AND i.status <> 'draft'
         AND i.status <> 'cancelled'
       ORDER BY i.created_at DESC`,
      [portalClientId],
    );
    return rows.map(mapInvoice);
  });
}

export async function countUnpaidInvoicesForPortal(portalClientId: string): Promise<number> {
  return withDb(async (query) => {
    await syncOverdueInvoices(query);
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM invoices i
       INNER JOIN clients c ON c.id = i.client_id
       WHERE c.portal_client_id = $1
         AND i.status IN ('sent', 'overdue')`,
      [portalClientId],
    );
    return Number(rows[0]?.count ?? 0);
  });
}

export async function getInvoiceStats(): Promise<{
  total: number;
  sent: number;
  paid: number;
  overdue: number;
  totalOutstanding: number;
}> {
  return withDb(async (query) => {
    const { rows } = await query<{
      total: string;
      sent: string;
      paid: string;
      overdue: string;
      outstanding: string;
    }>(`
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE status = 'sent')::text AS sent,
        COUNT(*) FILTER (WHERE status = 'paid')::text AS paid,
        COUNT(*) FILTER (WHERE status = 'overdue')::text AS overdue,
        COALESCE(SUM(total - paid_amount) FILTER (WHERE status IN ('sent', 'overdue')), 0)::text AS outstanding
      FROM invoices
    `);
    const row = rows[0]!;
    return {
      total: Number(row.total),
      sent: Number(row.sent),
      paid: Number(row.paid),
      overdue: Number(row.overdue),
      totalOutstanding: Number(row.outstanding),
    };
  });
}

export async function createInvoice(input: z.infer<typeof createInvoiceSchema>): Promise<Invoice> {
  return withDb(async (query) => {
    const reference = await nextReference(query);
    const subtotal = input.lines.reduce((sum, line) => sum + line.amount, 0);
    const { tvaAmount, total } = computeTotals(subtotal, input.tvaRate);
    const status = input.status ?? "draft";
    const sentAt = status === "sent" ? new Date() : null;
    const currency = normalizeCurrency(input.currency);
    const exchangeRateToXof = resolveExchangeRateToXof(currency, input.exchangeRateToXof);
    const exchangeRateAt = exchangeRateToXof != null ? new Date() : null;

    const { rows } = await query<{ id: string }>(
      `INSERT INTO invoices (
        reference, client_id, project_id, quote_id, name, email, company,
        lines, subtotal, tva_rate, tva_amount, total, status, due_date, sent_at, notes,
        currency, exchange_rate_to_xof, exchange_rate_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING id`,
      [
        reference,
        input.clientId ?? null,
        input.projectId ?? null,
        input.quoteId ?? null,
        input.name,
        input.email,
        input.company ?? null,
        JSON.stringify(input.lines),
        subtotal,
        input.tvaRate,
        tvaAmount,
        total,
        status,
        input.dueDate ?? null,
        sentAt,
        input.notes ?? null,
        currency,
        exchangeRateToXof,
        exchangeRateAt,
      ],
    );
    const id = rows[0]!.id;
    const { syncInvoiceLines } = await import("@/lib/line-items-sync");
    await syncInvoiceLines(query, id, input.lines);
    const { rows: fullRows } = await query<InvoiceRow>(`${listSelect} WHERE i.id = $1`, [id]);
    return mapInvoice(fullRows[0]!);
  });
}

export async function updateInvoice(
  id: string,
  input: z.infer<typeof updateInvoiceSchema>,
): Promise<Invoice | null> {
  return withDb(async (query) => {
    const { rows: existingRows } = await query<InvoiceRow>(
      `${listSelect} WHERE i.id = $1`,
      [id],
    );
    const existingRow = existingRows[0];
    if (!existingRow) return null;
    const existing = mapInvoice(existingRow);

    let subtotal = existing.subtotal;
    let tvaRate = existing.tvaRate;
    let lines = existing.lines;

    if (input.lines) {
      lines = input.lines;
      subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
    }
    if (input.tvaRate !== undefined) tvaRate = input.tvaRate;
    const { tvaAmount, total } = computeTotals(subtotal, tvaRate);

    const status = input.status ?? existing.status;
    let paidAmount = input.paidAmount ?? existing.paidAmount;
    if (paidAmount > total) paidAmount = total;

    let nextStatus = status;
    if (paidAmount >= total && total > 0) {
      nextStatus = "paid";
    } else if (nextStatus === "paid" && paidAmount < total) {
      nextStatus = existing.dueDate && new Date(existing.dueDate) < new Date() ? "overdue" : "sent";
    }

    const sentAt =
      nextStatus === "sent" && !existing.sentAt ? new Date() : existing.sentAt ? new Date(existing.sentAt) : null;
    const paidAt =
      nextStatus === "paid" && !existing.paidAt ? new Date() : existing.paidAt ? new Date(existing.paidAt) : null;

    await query(
      `UPDATE invoices SET
        lines = $2,
        subtotal = $3,
        tva_rate = $4,
        tva_amount = $5,
        total = $6,
        status = $7,
        paid_amount = $8,
        due_date = $9,
        sent_at = $10,
        paid_at = $11,
        notes = $12,
        metadata = $13::jsonb,
        updated_at = NOW()
       WHERE id = $1`,
      [
        id,
        JSON.stringify(lines),
        subtotal,
        tvaRate,
        tvaAmount,
        total,
        nextStatus,
        paidAmount,
        input.dueDate !== undefined ? input.dueDate : existing.dueDate,
        sentAt,
        paidAt,
        input.notes !== undefined ? input.notes : existing.notes,
        JSON.stringify(
          input.metadata
            ? { ...(existing.metadata ?? {}), ...input.metadata }
            : existing.metadata ?? {},
        ),
      ],
    );

    if (input.lines) {
      const { syncInvoiceLines } = await import("@/lib/line-items-sync");
      await syncInvoiceLines(query, id, lines);
    }

    const { rows: fullRows } = await query<InvoiceRow>(`${listSelect} WHERE i.id = $1`, [id]);
    const updated = fullRows[0] ? mapInvoice(fullRows[0]) : null;

    if (updated && existing.status !== "paid" && updated.status === "paid") {
      void import("@/lib/crm-audit").then(({ logCrmAudit }) =>
        logCrmAudit({
          actor: { userId: null, name: "Système", email: null },
          action: "invoice.paid",
          entityType: "invoice",
          entityId: id,
          summary: `Facture ${updated.reference} soldée.`,
          metadata: { total: updated.total, currency: updated.currency },
        }),
      );
    }

    return updated;
  });
}

export async function deleteInvoice(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rows } = await query<{ archived_at: Date | null }>(
      `SELECT archived_at FROM invoices WHERE id = $1`,
      [id],
    );
    if (rows[0]?.archived_at) {
      throw new Error("Cette facture est archivée et ne peut pas être supprimée.");
    }
    const { rowCount } = await query(`DELETE FROM invoices WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function createInvoiceFromQuote(quoteId: string): Promise<Invoice | null> {
  const quote = await getQuoteById(quoteId);
  if (!quote) return null;

  const lines = quote.lines.length
    ? quote.lines
    : [{ label: "Prestation", amount: quote.subtotal }];

  return createInvoice({
    clientId: quote.clientId,
    projectId: quote.projectId,
    quoteId: quote.id,
    name: quote.name,
    email: quote.email,
    company: quote.company,
    lines,
    tvaRate: 18,
    status: "draft",
    dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
    currency: normalizeCurrency(quote.currency),
    exchangeRateToXof: quote.exchangeRateToXof,
  });
}

export function getInvoiceRemaining(invoice: Invoice): number {
  return Math.max(0, invoice.total - invoice.paidAmount);
}
