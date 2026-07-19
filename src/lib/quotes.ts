import { z } from "zod";
import type { QueryResultRow } from "pg";
import { withDb } from "@/lib/db";
import type { QuoteStatus } from "@/content/quotes-labels";
import { QUOTE_STATUSES } from "@/content/quotes-labels";
import { updateLead } from "@/lib/leads";
import type { QuoteLine } from "@/lib/quote-calculator";
import {
  normalizeCurrency,
  resolveExchangeRateToXof,
  SUPPORTED_CURRENCIES,
} from "@/lib/currencies";

export type Quote = {
  id: string;
  reference: string;
  leadId: string | null;
  clientId: string | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  projectTypeId: string | null;
  projectLabel: string;
  pageTierId: string | null;
  addonIds: string[];
  lines: QuoteLine[];
  subtotal: number;
  estimateMin: number | null;
  estimateMax: number | null;
  budget: string | null;
  timeline: string | null;
  message: string | null;
  status: QuoteStatus;
  sentAt: string | null;
  followUpAt: string | null;
  validUntil: string | null;
  viewedAt: string | null;
  signedAt: string | null;
  validatedAt: string | null;
  rejectionReason: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  currency: string;
  /** 1 unité de `currency` = N XOF (null si XOF). */
  exchangeRateToXof: number | null;
  exchangeRateAt: string | null;
  legalEntityId: string | null;
  createdAt: string;
  updatedAt: string;
};

type QuoteRow = {
  id: string;
  reference: string;
  lead_id: string | null;
  client_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  project_type_id: string | null;
  project_label: string;
  page_tier_id: string | null;
  addon_ids: string[] | null;
  lines: QuoteLine[] | null;
  subtotal: number;
  estimate_min: number | null;
  estimate_max: number | null;
  budget: string | null;
  timeline: string | null;
  message: string | null;
  status: QuoteStatus;
  sent_at: Date | null;
  follow_up_at: Date | null;
  valid_until: Date | null;
  viewed_at: Date | null;
  signed_at: Date | null;
  validated_at: Date | null;
  rejection_reason: string | null;
  rejected_at: Date | null;
  rejected_by: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  currency?: string | null;
  exchange_rate_to_xof?: string | number | null;
  exchange_rate_at?: Date | null;
  legal_entity_id?: string | null;
  created_at: Date;
  updated_at: Date;
};

type LeadImportRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  service: string | null;
  budget: string | null;
  timeline: string | null;
  message: string | null;
  estimated_value: number | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
};

function mapQuote(row: QuoteRow): Quote {
  return {
    id: row.id,
    reference: row.reference,
    leadId: row.lead_id,
    clientId: row.client_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    projectTypeId: row.project_type_id,
    projectLabel: row.project_label,
    pageTierId: row.page_tier_id,
    addonIds: row.addon_ids ?? [],
    lines: row.lines ?? [],
    subtotal: row.subtotal,
    estimateMin: row.estimate_min,
    estimateMax: row.estimate_max,
    budget: row.budget,
    timeline: row.timeline,
    message: row.message,
    status: row.status,
    sentAt: row.sent_at?.toISOString() ?? null,
    followUpAt: row.follow_up_at?.toISOString() ?? null,
    validUntil: row.valid_until?.toISOString() ?? null,
    viewedAt: row.viewed_at?.toISOString() ?? null,
    signedAt: row.signed_at?.toISOString() ?? null,
    validatedAt: row.validated_at?.toISOString() ?? null,
    rejectionReason: row.rejection_reason,
    rejectedAt: row.rejected_at?.toISOString() ?? null,
    rejectedBy: row.rejected_by,
    notes: row.notes,
    metadata: row.metadata ?? {},
    currency: row.currency ?? "XOF",
    exchangeRateToXof:
      row.exchange_rate_to_xof != null ? Number(row.exchange_rate_to_xof) : null,
    exchangeRateAt: row.exchange_rate_at?.toISOString() ?? null,
    legalEntityId: row.legal_entity_id ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const createQuoteSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(50).optional().nullable(),
  company: z.string().trim().max(160).optional().nullable(),
  projectTypeId: z.string().trim().max(50).optional().nullable(),
  projectLabel: z.string().trim().min(1).max(200),
  pageTierId: z.string().trim().max(50).optional().nullable(),
  addonIds: z.array(z.string()).default([]),
  lines: z
    .array(
      z.object({
        label: z.string(),
        amount: z.number().int().min(0),
        quantity: z.number().positive().optional(),
        unitPrice: z.number().int().min(0).optional(),
        catalogItemId: z.string().uuid().optional(),
      }),
    )
    .min(1)
    .default([]),
  subtotal: z.number().int().min(0),
  estimateMin: z.number().int().min(0).optional().nullable(),
  estimateMax: z.number().int().min(0).optional().nullable(),
  budget: z.string().trim().max(50).optional().nullable(),
  timeline: z.string().trim().max(50).optional().nullable(),
  message: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(QUOTE_STATUSES).default("sent"),
  leadId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  exchangeRateToXof: z.number().positive().optional().nullable(),
  legalEntityId: z.string().uuid().optional().nullable(),
});

export const updateQuoteSchema = z.object({
  status: z.enum(QUOTE_STATUSES).optional(),
  followUpAt: z.string().optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  exchangeRateToXof: z.number().positive().optional().nullable(),
  legalEntityId: z.string().uuid().optional().nullable(),
});

type DbQuery = (
  text: string,
  params?: unknown[],
) => Promise<{ rows: QueryResultRow[]; rowCount: number | null }>;

function isPgUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

async function nextReference(query: DbQuery): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `DEV-${year}-`;

  await query(`SELECT pg_advisory_lock($1)`, [year]);
  try {
    const { rows } = await query(
      `SELECT COALESCE(MAX(CAST(SPLIT_PART(reference, '-', 3) AS INTEGER)), 0)::int + 1 AS next
       FROM quotes
       WHERE reference LIKE $1`,
      [`${prefix}%`],
    );
    const seq = String(Number((rows[0] as { next: number })?.next ?? 1)).padStart(4, "0");
    return `${prefix}${seq}`;
  } finally {
    await query(`SELECT pg_advisory_unlock($1)`, [year]);
  }
}

async function importMissingDevisLeads(query: DbQuery): Promise<void> {
  const { rows } = await query(
    `SELECT l.*
     FROM leads l
     LEFT JOIN quotes q ON q.lead_id = l.id
     WHERE l.source = 'devis' AND q.id IS NULL
     ORDER BY l.created_at ASC`,
  );

  for (const row of rows) {
    const lead = row as unknown as LeadImportRow;
    const meta = lead.metadata ?? {};
    const lines = (meta.lines as QuoteLine[] | undefined) ?? [];
    const subtotal =
      lead.estimated_value ??
      lines.reduce((sum, line) => sum + (line.amount ?? 0), 0);

    for (let attempt = 0; attempt < 3; attempt++) {
      const ref = await nextReference(query);
      try {
        await query(
          `INSERT INTO quotes (
            reference, lead_id, name, email, phone, company,
            project_type_id, project_label, page_tier_id, addon_ids, lines,
            subtotal, estimate_min, estimate_max, budget, timeline, message,
            status, sent_at, metadata
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'sent',$18,$19)`,
          [
            ref,
            lead.id,
            lead.name,
            lead.email,
            lead.phone,
            lead.company,
            (meta.projectTypeId as string) ?? null,
            lead.service ?? "Projet web",
            (meta.pageTierId as string) ?? null,
            JSON.stringify((meta.addonIds as string[]) ?? []),
            JSON.stringify(lines),
            subtotal,
            null,
            null,
            lead.budget,
            lead.timeline,
            lead.message,
            lead.created_at,
            JSON.stringify({ importedFromLead: true, ...meta }),
          ],
        );
        break;
      } catch (error) {
        if (isPgUniqueViolation(error) && attempt < 2) continue;
        if (isPgUniqueViolation(error)) {
          console.warn("[quotes] importMissingDevisLeads skip lead", lead.id, error);
          break;
        }
        throw error;
      }
    }
  }
}

export async function listQuotes(status?: QuoteStatus): Promise<Quote[]> {
  return listQuotesFiltered(status ? { status } : {});
}

export type QuoteListFilters = {
  status?: QuoteStatus;
  clientId?: string;
  amountMin?: number;
  amountMax?: number;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
};

export async function listQuotesFiltered(filters: QuoteListFilters = {}): Promise<Quote[]> {
  return withDb(async (query) => {
    try {
      await importMissingDevisLeads(query);
    } catch (error) {
      console.error("[quotes] importMissingDevisLeads", error);
    }

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.status) {
      conditions.push(`status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters.clientId) {
      conditions.push(`client_id = $${idx++}`);
      params.push(filters.clientId);
    }
    if (filters.amountMin !== undefined && filters.amountMin > 0) {
      conditions.push(`subtotal >= $${idx++}`);
      params.push(filters.amountMin);
    }
    if (filters.amountMax !== undefined && filters.amountMax > 0) {
      conditions.push(`subtotal <= $${idx++}`);
      params.push(filters.amountMax);
    }
    if (filters.dateFrom) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(new Date(`${filters.dateFrom}T00:00:00`));
    }
    if (filters.dateTo) {
      conditions.push(`created_at <= $${idx++}`);
      params.push(new Date(`${filters.dateTo}T23:59:59`));
    }
    if (filters.q?.trim()) {
      const pattern = `%${filters.q.trim().replace(/[%_\\]/g, "\\$&")}%`;
      conditions.push(
        `(name ILIKE $${idx} OR email ILIKE $${idx} OR company ILIKE $${idx} OR project_label ILIKE $${idx} OR reference ILIKE $${idx})`,
      );
      params.push(pattern);
      idx += 1;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await query<QuoteRow>(
      `SELECT * FROM quotes ${where} ORDER BY created_at DESC`,
      params,
    );
    return rows.map(mapQuote);
  });
}

export async function getQuoteById(id: string): Promise<Quote | null> {
  return withDb(async (query) => {
    const { rows } = await query<QuoteRow>(`SELECT * FROM quotes WHERE id = $1`, [id]);
    return rows[0] ? mapQuote(rows[0]) : null;
  });
}

export async function createQuote(
  input: z.infer<typeof createQuoteSchema>,
): Promise<Quote> {
  return withDb(async (query) => {
    const reference = await nextReference(query);
    const status = input.status ?? "sent";
    const sentAt = status === "sent" || status === "follow_up" ? new Date() : null;
    const currency = normalizeCurrency(input.currency);
    const exchangeRateToXof = resolveExchangeRateToXof(currency, input.exchangeRateToXof);
    const exchangeRateAt = exchangeRateToXof != null ? new Date() : null;

    const { rows } = await query<QuoteRow>(
      `INSERT INTO quotes (
        reference, lead_id, client_id, name, email, phone, company,
        project_type_id, project_label, page_tier_id, addon_ids, lines,
        subtotal, estimate_min, estimate_max, budget, timeline, message,
        status, sent_at, notes, metadata, currency, exchange_rate_to_xof,
        exchange_rate_at, legal_entity_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
      RETURNING *`,
      [
        reference,
        input.leadId ?? null,
        input.clientId ?? null,
        input.name,
        input.email,
        input.phone ?? null,
        input.company ?? null,
        input.projectTypeId ?? null,
        input.projectLabel,
        input.pageTierId ?? null,
        JSON.stringify(input.addonIds ?? []),
        JSON.stringify(input.lines ?? []),
        input.subtotal,
        input.estimateMin ?? null,
        input.estimateMax ?? null,
        input.budget ?? null,
        input.timeline ?? null,
        input.message ?? null,
        status,
        sentAt,
        input.notes ?? null,
        JSON.stringify(input.metadata ?? {}),
        currency,
        exchangeRateToXof,
        exchangeRateAt,
        input.legalEntityId ?? null,
      ],
    );

    const quote = mapQuote(rows[0]);
    const { syncQuoteLines } = await import("@/lib/line-items-sync");
    await syncQuoteLines(query, quote.id, input.lines ?? []);
    return quote;
  });
}

export async function updateQuote(
  id: string,
  input: z.infer<typeof updateQuoteSchema>,
): Promise<Quote | null> {
  return withDb(async (query) => {
    const { rows: existingRows } = await query<QuoteRow>(
      `SELECT * FROM quotes WHERE id = $1`,
      [id],
    );
    const existing = existingRows[0];
    if (!existing) return null;

    const nextStatus = input.status ?? existing.status;
    const nextFollowUpAt =
      input.followUpAt !== undefined ? input.followUpAt : existing.follow_up_at?.toISOString() ?? null;

    let sentAt = existing.sent_at;
    if ((nextStatus === "sent" || nextStatus === "follow_up") && !sentAt) {
      sentAt = new Date();
    }

    const mergedMetadata = input.metadata
      ? { ...(existing.metadata ?? {}), ...input.metadata }
      : existing.metadata ?? {};

    const nextCurrency = normalizeCurrency(input.currency ?? existing.currency ?? "XOF");
    const rateInput =
      input.exchangeRateToXof !== undefined
        ? input.exchangeRateToXof
        : existing.exchange_rate_to_xof != null
          ? Number(existing.exchange_rate_to_xof)
          : null;
    const nextRate = resolveExchangeRateToXof(nextCurrency, rateInput);
    const currencyChanged =
      input.currency !== undefined || input.exchangeRateToXof !== undefined;
    const nextRateAt =
      nextRate == null
        ? null
        : currencyChanged
          ? new Date()
          : existing.exchange_rate_at ?? new Date();

    const { rows } = await query<QuoteRow>(
      `UPDATE quotes SET
        status = $2,
        follow_up_at = $3,
        notes = $4,
        client_id = $5,
        sent_at = $6,
        metadata = $7::jsonb,
        currency = $8,
        exchange_rate_to_xof = $9,
        exchange_rate_at = $10,
        legal_entity_id = $11,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        nextStatus,
        nextFollowUpAt,
        input.notes !== undefined ? input.notes : existing.notes,
        input.clientId !== undefined ? input.clientId : existing.client_id,
        sentAt,
        JSON.stringify(mergedMetadata),
        nextCurrency,
        nextRate,
        nextRateAt,
        input.legalEntityId !== undefined ? input.legalEntityId : existing.legal_entity_id,
      ],
    );

    const quote = mapQuote(rows[0]);

    if (nextStatus === "accepted" && quote.leadId) {
      void updateLead(quote.leadId, { status: "signed" });
    }
    if (nextStatus === "validated" && quote.leadId) {
      void updateLead(quote.leadId, { status: "signed" });
    }

    return quote;
  });
}

export async function deleteQuote(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM quotes WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function getQuoteStats(): Promise<{
  total: number;
  sent: number;
  accepted: number;
  conversionRate: number;
}> {
  return withDb(async (query) => {
    try {
      await importMissingDevisLeads(query);
    } catch (error) {
      console.error("[quotes] importMissingDevisLeads", error);
    }

    const { rows } = await query<{ status: QuoteStatus; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM quotes GROUP BY status`,
    );

    let total = 0;
    let sent = 0;
    let accepted = 0;

    for (const row of rows) {
      const count = Number(row.count);
      total += count;
      if (row.status === "accepted") accepted += count;
      if (["sent", "follow_up", "negotiation", "accepted", "validated", "signed", "invoiced", "rejected"].includes(row.status)) {
        sent += count;
      }
    }

    const conversionRate = sent > 0 ? Math.round((accepted / sent) * 100) : 0;

    return { total, sent, accepted, conversionRate };
  });
}

export async function listQuotesForPortalClient(portalClientId: string): Promise<Quote[]> {
  return withDb(async (query) => {
    const { rows } = await query<QuoteRow>(
      `SELECT q.*
       FROM quotes q
       INNER JOIN clients c ON c.id = q.client_id
       WHERE c.portal_client_id = $1
         AND q.status <> 'draft'
       ORDER BY q.created_at DESC`,
      [portalClientId],
    );
    return rows.map(mapQuote);
  });
}

export async function countActionableQuotesForPortal(portalClientId: string): Promise<number> {
  return withDb(async (query) => {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM quotes q
       INNER JOIN clients c ON c.id = q.client_id
       WHERE c.portal_client_id = $1
         AND q.status IN ('sent', 'viewed', 'follow_up', 'negotiation')`,
      [portalClientId],
    );
    return Number(rows[0]?.count ?? 0);
  });
}

export type DevisQuoteInput = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  projectTypeId: string;
  projectLabel: string;
  pageTierId?: string;
  addonIds: string[];
  lines: QuoteLine[];
  subtotal: number;
  estimateMin: number;
  estimateMax: number;
  budget: string;
  timeline: string;
  message?: string;
  leadId?: string | null;
};

export async function createQuoteFromDevis(input: DevisQuoteInput): Promise<Quote | null> {
  try {
    return await createQuote({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      company: input.company ?? null,
      projectTypeId: input.projectTypeId,
      projectLabel: input.projectLabel,
      pageTierId: input.pageTierId ?? null,
      addonIds: input.addonIds,
      lines: input.lines,
      subtotal: input.subtotal,
      estimateMin: input.estimateMin,
      estimateMax: input.estimateMax,
      budget: input.budget,
      timeline: input.timeline,
      message: input.message ?? null,
      status: "sent",
      leadId: input.leadId ?? null,
      metadata: {
        source: "configurateur",
        formattedSubtotal: input.subtotal,
      },
    });
  } catch (error) {
    console.error("[quotes] createQuoteFromDevis failed:", error);
    return null;
  }
}
