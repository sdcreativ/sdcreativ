import { withDb } from "@/lib/db";
import type { LeadStatus } from "@/lib/leads";
import type { QuoteStatus } from "@/content/quotes-labels";

export type DealStage =
  | "lead"
  | "quote"
  | "client"
  | "project"
  | "invoiced"
  | "lost";

export type DealRecord = {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  leadStatus: LeadStatus;
  leadAssignee: string | null;
  quoteId: string | null;
  quoteReference: string | null;
  quoteStatus: QuoteStatus | null;
  quoteAmount: number | null;
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
  projectStatus: string | null;
  invoiceCount: number;
  invoicedAmount: number;
  stage: DealStage;
  updatedAt: string;
};

type DealRow = {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_email: string;
  lead_status: LeadStatus;
  lead_assignee: string | null;
  quote_id: string | null;
  quote_reference: string | null;
  quote_status: QuoteStatus | null;
  quote_amount: number | null;
  client_id: string | null;
  client_name: string | null;
  project_id: string | null;
  project_name: string | null;
  project_status: string | null;
  invoice_count: string;
  invoiced_amount: string;
  stage: DealStage;
  updated_at: Date;
};

function mapDeal(row: DealRow): DealRecord {
  return {
    id: row.id,
    leadId: row.lead_id,
    leadName: row.lead_name,
    leadEmail: row.lead_email,
    leadStatus: row.lead_status,
    leadAssignee: row.lead_assignee,
    quoteId: row.quote_id,
    quoteReference: row.quote_reference,
    quoteStatus: row.quote_status,
    quoteAmount: row.quote_amount,
    clientId: row.client_id,
    clientName: row.client_name,
    projectId: row.project_id,
    projectName: row.project_name,
    projectStatus: row.project_status,
    invoiceCount: Number(row.invoice_count),
    invoicedAmount: Number(row.invoiced_amount),
    stage: row.stage,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listDeals(filters?: {
  assigneeId?: string;
  search?: string;
}): Promise<DealRecord[]> {
  return withDb(async (query) => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters?.assigneeId) {
      conditions.push(`l.assignee_id = $${idx++}`);
      params.push(filters.assigneeId);
    }

    if (filters?.search?.trim()) {
      conditions.push(
        `(l.name ILIKE $${idx} OR l.email ILIKE $${idx} OR COALESCE(l.company, '') ILIKE $${idx} OR COALESCE(q.reference, '') ILIKE $${idx})`,
      );
      params.push(`%${filters.search.trim()}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await query<DealRow>(
      `SELECT
        l.id,
        l.id AS lead_id,
        l.name AS lead_name,
        l.email AS lead_email,
        l.status AS lead_status,
        l.assignee AS lead_assignee,
        q.id AS quote_id,
        q.reference AS quote_reference,
        q.status AS quote_status,
        q.subtotal AS quote_amount,
        c.id AS client_id,
        COALESCE(c.company, c.name) AS client_name,
        p.id AS project_id,
        p.name AS project_name,
        p.status AS project_status,
        COALESCE(inv.cnt, 0)::text AS invoice_count,
        COALESCE(inv.total, 0)::text AS invoiced_amount,
        CASE
          WHEN l.status = 'lost' THEN 'lost'
          WHEN COALESCE(inv.cnt, 0) > 0 THEN 'invoiced'
          WHEN p.id IS NOT NULL THEN 'project'
          WHEN c.id IS NOT NULL THEN 'client'
          WHEN q.id IS NOT NULL THEN 'quote'
          ELSE 'lead'
        END AS stage,
        GREATEST(l.updated_at, COALESCE(q.updated_at, l.updated_at), COALESCE(c.updated_at, l.updated_at), COALESCE(p.updated_at, l.updated_at)) AS updated_at
      FROM leads l
      LEFT JOIN quotes q ON q.lead_id = l.id
      LEFT JOIN clients c ON c.lead_id = l.id
      LEFT JOIN projects p ON p.client_id = c.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt, COALESCE(SUM(i.subtotal), 0)::int AS total
        FROM invoices i
        WHERE i.quote_id = q.id OR i.project_id = p.id
      ) inv ON true
      ${where}
      ORDER BY updated_at DESC
      LIMIT 200`,
      params,
    );

    return rows.map(mapDeal);
  });
}
