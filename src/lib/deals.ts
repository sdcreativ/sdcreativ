import { z } from "zod";
import { withDb } from "@/lib/db";
import { getLeadById, updateLead } from "@/lib/leads";
import { createClientFromLead } from "@/lib/clients";
import { createQuote } from "@/lib/quotes";
import { createProject } from "@/lib/projects";
import type { QuoteStatus } from "@/content/quotes-labels";
import type { DealLeadStatus, DealRecord, DealStage } from "@/lib/deals-types";

export type { DealLeadStatus, DealRecord, DealStage } from "@/lib/deals-types";
export { DEAL_STAGES } from "@/lib/deals-types";

type DealRow = {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_email: string;
  lead_status: DealLeadStatus;
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

const DEAL_SELECT = `
  SELECT
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
    GREATEST(
      l.updated_at,
      COALESCE(q.updated_at, l.updated_at),
      COALESCE(c.updated_at, l.updated_at),
      COALESCE(p.updated_at, l.updated_at)
    ) AS updated_at
  FROM leads l
  LEFT JOIN LATERAL (
    SELECT q2.id, q2.reference, q2.status, q2.subtotal, q2.updated_at
    FROM quotes q2
    WHERE q2.lead_id = l.id
    ORDER BY
      CASE q2.status
        WHEN 'accepted' THEN 0
        WHEN 'validated' THEN 0
        WHEN 'signed' THEN 1
        WHEN 'invoiced' THEN 1
        WHEN 'negotiation' THEN 2
        WHEN 'sent' THEN 3
        WHEN 'viewed' THEN 3
        WHEN 'follow_up' THEN 3
        WHEN 'draft' THEN 4
        ELSE 5
      END,
      q2.updated_at DESC
    LIMIT 1
  ) q ON true
  LEFT JOIN clients c ON c.lead_id = l.id
  LEFT JOIN LATERAL (
    SELECT p2.id, p2.name, p2.status, p2.updated_at
    FROM projects p2
    WHERE p2.client_id = c.id
    ORDER BY
      CASE
        WHEN p2.status IN ('cancelled') THEN 2
        WHEN p2.status = 'delivered' THEN 1
        ELSE 0
      END,
      p2.updated_at DESC
    LIMIT 1
  ) p ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS cnt, COALESCE(SUM(i.subtotal), 0)::int AS total
    FROM invoices i
    WHERE (q.id IS NOT NULL AND i.quote_id = q.id)
       OR (p.id IS NOT NULL AND i.project_id = p.id)
  ) inv ON true
`;

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
      `${DEAL_SELECT}
      ${where}
      ORDER BY updated_at DESC
      LIMIT 200`,
      params,
    );

    return rows.map(mapDeal);
  });
}

export async function getDealByLeadId(leadId: string): Promise<DealRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<DealRow>(`${DEAL_SELECT} WHERE l.id = $1 LIMIT 1`, [leadId]);
    return rows[0] ? mapDeal(rows[0]) : null;
  });
}

export const updateDealStageSchema = z.object({
  stage: z.enum(["lead", "quote", "client", "project", "invoiced", "lost"]),
});

/**
 * Avance / recule une opportunité vers une étape cible.
 * Les étapes structurelles créent les entités manquantes (devis, client, projet).
 * « invoiced » ne peut pas être forcée sans facture existante.
 */
export async function updateDealStage(
  leadId: string,
  targetStage: DealStage,
): Promise<DealRecord> {
  const current = await getDealByLeadId(leadId);
  if (!current) {
    throw new Error("Opportunité introuvable.");
  }

  if (current.stage === targetStage) {
    return current;
  }

  if (targetStage === "invoiced" && current.invoiceCount === 0) {
    throw new Error(
      "Impossible de passer en « Facturé » sans facture. Créez une facture depuis le devis ou le projet.",
    );
  }

  if (targetStage === "lost") {
    await updateLead(leadId, { status: "lost" });
    const next = await getDealByLeadId(leadId);
    if (!next) throw new Error("Opportunité introuvable après mise à jour.");
    return next;
  }

  if (current.stage === "lost" || targetStage === "lead") {
    const lead = await getLeadById(leadId);
    if (lead?.status === "lost") {
      await updateLead(leadId, { status: "contacted" });
    }
  }

  if (targetStage === "quote" || targetStage === "client" || targetStage === "project" || targetStage === "invoiced") {
    let deal = (await getDealByLeadId(leadId))!;

    if (!deal.quoteId && (targetStage === "quote" || targetStage === "client" || targetStage === "project" || targetStage === "invoiced")) {
      const lead = await getLeadById(leadId);
      if (!lead) throw new Error("Lead introuvable.");
      const amount = lead.estimatedValue ?? 0;
      await createQuote({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        projectLabel: lead.service || "Projet web",
        addonIds: [],
        lines: [{ label: lead.service || "Prestation", amount }],
        subtotal: amount,
        status: "draft",
        leadId: lead.id,
        message: lead.message,
        budget: lead.budget,
        timeline: lead.timeline,
      });
      await updateLead(leadId, { status: "quote_sent" });
      deal = (await getDealByLeadId(leadId))!;
    } else if (deal.quoteId) {
      await updateLead(leadId, { status: "quote_sent" });
      deal = (await getDealByLeadId(leadId))!;
    }

    if (
      !deal.clientId &&
      (targetStage === "client" || targetStage === "project" || targetStage === "invoiced")
    ) {
      const client = await createClientFromLead(leadId);
      if (!client) throw new Error("Impossible de convertir le lead en client.");
      await updateLead(leadId, { status: "signed" });
      deal = (await getDealByLeadId(leadId))!;
    }

    if (!deal.projectId && (targetStage === "project" || targetStage === "invoiced")) {
      if (!deal.clientId) throw new Error("Client requis pour créer un projet.");
      const lead = await getLeadById(leadId);
      await createProject({
        clientId: deal.clientId,
        name: deal.clientName
          ? `Projet — ${deal.clientName}`
          : lead?.service || `Projet — ${deal.leadName}`,
        type: "site_vitrine",
        status: "discovery",
        budget: deal.quoteAmount,
        seedMilestones: true,
        description: lead?.message ?? null,
        assignee: lead?.assignee ?? null,
      });
      deal = (await getDealByLeadId(leadId))!;
    }

    if (targetStage === "invoiced" && deal.invoiceCount === 0) {
      throw new Error(
        "Projet prêt — créez une facture depuis le devis accepté pour atteindre « Facturé ».",
      );
    }

    const next = await getDealByLeadId(leadId);
    if (!next) throw new Error("Opportunité introuvable après mise à jour.");
    return next;
  }

  const next = await getDealByLeadId(leadId);
  if (!next) throw new Error("Opportunité introuvable après mise à jour.");
  return next;
}
