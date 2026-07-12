import { z } from "zod";
import type { QueryResultRow } from "pg";
import { withDb } from "@/lib/db";
import { getInvoiceById, updateInvoice } from "@/lib/invoices";
import type { CreditNoteStatus } from "@/content/credit-notes-labels";
import { CREDIT_NOTE_STATUSES } from "@/content/credit-notes-labels";

export type CreditNote = {
  id: string;
  reference: string;
  invoiceId: string;
  invoiceReference: string | null;
  clientId: string | null;
  clientName: string | null;
  amount: number;
  reason: string | null;
  status: CreditNoteStatus;
  issuedAt: string | null;
  appliedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type CreditNoteRow = {
  id: string;
  reference: string;
  invoice_id: string;
  invoice_reference: string | null;
  client_id: string | null;
  client_name: string | null;
  amount: number;
  reason: string | null;
  status: CreditNoteStatus;
  issued_at: Date | null;
  applied_at: Date | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
};

const select = `
  SELECT cn.*, i.reference AS invoice_reference, c.name AS client_name
  FROM credit_notes cn
  LEFT JOIN invoices i ON i.id = cn.invoice_id
  LEFT JOIN clients c ON c.id = cn.client_id
`;

function mapCreditNote(row: CreditNoteRow): CreditNote {
  return {
    id: row.id,
    reference: row.reference,
    invoiceId: row.invoice_id,
    invoiceReference: row.invoice_reference,
    clientId: row.client_id,
    clientName: row.client_name,
    amount: row.amount,
    reason: row.reason,
    status: row.status,
    issuedAt: row.issued_at?.toISOString() ?? null,
    appliedAt: row.applied_at?.toISOString() ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function nextReference(
  query: (text: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[]; rowCount: number | null }>,
): Promise<string> {
  const year = new Date().getFullYear();
  const { rows } = await query(
    `SELECT COUNT(*)::text AS count FROM credit_notes WHERE EXTRACT(YEAR FROM created_at) = $1`,
    [year],
  );
  const seq = String(Number((rows[0] as { count: string })?.count ?? 0) + 1).padStart(4, "0");
  return `AV-${year}-${seq}`;
}

export const createCreditNoteSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().int().positive(),
  reason: z.string().trim().max(2000).optional().nullable(),
});

export const updateCreditNoteSchema = z.object({
  amount: z.number().int().positive().optional(),
  reason: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(CREDIT_NOTE_STATUSES).optional(),
});

export async function listCreditNotes(filters?: {
  clientId?: string;
  invoiceId?: string;
}): Promise<CreditNote[]> {
  return withDb(async (query) => {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters?.clientId) {
      params.push(filters.clientId);
      clauses.push(`cn.client_id = $${params.length}`);
    }
    if (filters?.invoiceId) {
      params.push(filters.invoiceId);
      clauses.push(`cn.invoice_id = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await query<CreditNoteRow>(
      `${select} ${where} ORDER BY cn.created_at DESC`,
      params,
    );
    return rows.map(mapCreditNote);
  });
}

export async function getCreditNoteById(id: string): Promise<CreditNote | null> {
  return withDb(async (query) => {
    const { rows } = await query<CreditNoteRow>(`${select} WHERE cn.id = $1`, [id]);
    return rows[0] ? mapCreditNote(rows[0]) : null;
  });
}

export async function createCreditNote(
  input: z.infer<typeof createCreditNoteSchema>,
): Promise<CreditNote> {
  return withDb(async (query) => {
    const invoice = await getInvoiceById(input.invoiceId);
    if (!invoice) throw new Error("Facture introuvable.");

    const remaining = invoice.total - invoice.paidAmount;
    if (input.amount > remaining) {
      throw new Error(`Le montant ne peut pas dépasser le solde restant (${remaining}).`);
    }

    const reference = await nextReference(query);
    const { rows } = await query<CreditNoteRow>(
      `INSERT INTO credit_notes (reference, invoice_id, client_id, amount, reason)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [reference, input.invoiceId, invoice.clientId, input.amount, input.reason ?? null],
    );
    const row = rows[0]!;
    const { rows: full } = await query<CreditNoteRow>(`${select} WHERE cn.id = $1`, [row.id]);
    return mapCreditNote(full[0]!);
  });
}

export async function updateCreditNote(
  id: string,
  input: z.infer<typeof updateCreditNoteSchema>,
): Promise<CreditNote | null> {
  return withDb(async (query) => {
    const existing = await getCreditNoteById(id);
    if (!existing) return null;

    if (input.status === "applied" && existing.status !== "applied") {
      await applyCreditNoteToInvoice(existing);
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    if (input.amount !== undefined) {
      params.push(input.amount);
      sets.push(`amount = $${params.length}`);
    }
    if (input.reason !== undefined) {
      params.push(input.reason);
      sets.push(`reason = $${params.length}`);
    }
    if (input.status !== undefined) {
      params.push(input.status);
      sets.push(`status = $${params.length}`);
      if (input.status === "issued") {
        sets.push(`issued_at = NOW()`);
      }
      if (input.status === "applied") {
        sets.push(`applied_at = NOW()`);
      }
    }
    if (sets.length === 0) return existing;

    params.push(id);
    await query(
      `UPDATE credit_notes SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${params.length}`,
      params,
    );
    return getCreditNoteById(id);
  });
}

async function applyCreditNoteToInvoice(note: CreditNote): Promise<void> {
  const invoice = await getInvoiceById(note.invoiceId);
  if (!invoice) return;

  const newPaid = Math.min(invoice.total, invoice.paidAmount + note.amount);
  const status =
    newPaid >= invoice.total ? "paid" : invoice.status === "cancelled" ? "cancelled" : invoice.status;

  await updateInvoice(invoice.id, {
    paidAmount: newPaid,
    status: status as typeof invoice.status,
  });
}

export async function getClientCreditBalance(clientId: string): Promise<number> {
  return withDb(async (query) => {
    const { rows } = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS total
       FROM credit_notes
       WHERE client_id = $1 AND status = 'applied'`,
      [clientId],
    );
    return Number(rows[0]?.total ?? 0);
  });
}

export async function deleteCreditNote(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const note = await getCreditNoteById(id);
    if (!note || note.status === "applied") return false;
    const { rowCount } = await query(`DELETE FROM credit_notes WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}
