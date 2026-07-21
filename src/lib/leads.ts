import { z } from "zod";
import { withDb, withDbTransaction, isDatabaseConfigured } from "@/lib/db";
import { createLeadActivity } from "@/lib/lead-activities";
import { LEAD_SOURCE_LABELS } from "@/content/leads-labels";

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "quote_sent",
  "signed",
  "lost",
] as const;

export const LEAD_SOURCES = [
  "contact",
  "devis",
  "presentation_tablet",
  "waitlist",
  "manual",
  "whatsapp",
  "live_chat_3cx",
  "call_3cx",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadSource = (typeof LEAD_SOURCES)[number];

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  source: LeadSource;
  status: LeadStatus;
  service: string | null;
  budget: string | null;
  timeline: string | null;
  message: string | null;
  estimatedValue: number | null;
  assignee: string | null;
  assigneeId: string | null;
  marketingOptIn: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type LeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  source: LeadSource;
  status: LeadStatus;
  service: string | null;
  budget: string | null;
  timeline: string | null;
  message: string | null;
  estimated_value: number | null;
  assignee: string | null;
  assignee_id: string | null;
  marketing_opt_in?: boolean | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
};

function mapLead(row: LeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    source: row.source,
    status: row.status,
    service: row.service,
    budget: row.budget,
    timeline: row.timeline,
    message: row.message,
    estimatedValue: row.estimated_value,
    assignee: row.assignee ?? null,
    assigneeId: row.assignee_id ?? null,
    marketingOptIn: Boolean(row.marketing_opt_in),
    metadata: row.metadata ?? {},
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export type CreateLeadInput = {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  source: LeadSource;
  status?: LeadStatus;
  service?: string | null;
  budget?: string | null;
  timeline?: string | null;
  message?: string | null;
  estimatedValue?: number | null;
  assignee?: string | null;
  assigneeId?: string | null;
  marketingOptIn?: boolean;
  actorName?: string | null;
  metadata?: Record<string, unknown>;
};

export const createLeadSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(50).optional().nullable(),
  company: z.string().trim().max(160).optional().nullable(),
  source: z.enum(LEAD_SOURCES).default("manual"),
  status: z.enum(LEAD_STATUSES).default("new"),
  service: z.string().trim().max(100).optional().nullable(),
  budget: z.string().trim().max(50).optional().nullable(),
  timeline: z.string().trim().max(50).optional().nullable(),
  message: z.string().trim().max(5000).optional().nullable(),
  estimatedValue: z.number().int().min(0).optional().nullable(),
  assignee: z.string().trim().max(100).optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  marketingOptIn: z.boolean().optional().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateLeadSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  name: z.string().trim().min(2).max(160).optional(),
  phone: z.string().trim().max(50).optional().nullable(),
  company: z.string().trim().max(160).optional().nullable(),
  service: z.string().trim().max(100).optional().nullable(),
  budget: z.string().trim().max(50).optional().nullable(),
  timeline: z.string().trim().max(50).optional().nullable(),
  message: z.string().trim().max(5000).optional().nullable(),
  estimatedValue: z.number().int().min(0).optional().nullable(),
  assignee: z.string().trim().max(100).optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  marketingOptIn: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function createLead(input: CreateLeadInput): Promise<Lead | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    return await withDb(async (query) => {
      const { resolveAssigneeInput } = await import("@/lib/crm-assignee");
      const assigneeFields = await resolveAssigneeInput({
        assigneeId: (input as { assigneeId?: string | null }).assigneeId,
        assignee: input.assignee,
      });
      const { rows } = await query<LeadRow>(
        `INSERT INTO leads (
          name, email, phone, company, source, status,
          service, budget, timeline, message, estimated_value, assignee, assignee_id,
          marketing_opt_in, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        RETURNING *`,
        [
          input.name,
          input.email,
          input.phone ?? null,
          input.company ?? null,
          input.source,
          input.status ?? "new",
          input.service ?? null,
          input.budget ?? null,
          input.timeline ?? null,
          input.message ?? null,
          input.estimatedValue ?? null,
          assigneeFields.assignee,
          assigneeFields.assigneeId,
          input.marketingOptIn ?? false,
          JSON.stringify(input.metadata ?? {}),
        ],
      );
      const lead = mapLead(rows[0]!);
      void createLeadActivity({
        leadId: lead.id,
        type: "created",
        content: `Lead créé — source : ${LEAD_SOURCE_LABELS[lead.source]}`,
        actorName: input.actorName ?? null,
      }).catch((err) => console.error("[leads] createLead activity failed:", err));
      void import("@/lib/marketing-sequences").then(({ enrollLeadInActiveSequences }) =>
        enrollLeadInActiveSequences(lead.id, lead.status).catch((err) =>
          console.error("[leads] sequence enrollment failed:", err),
        ),
      );
      return lead;
    });
  } catch (error) {
    console.error("[leads] createLead failed:", error);
    return null;
  }
}

export async function listLeads(status?: LeadStatus): Promise<Lead[]> {
  const { paginateAll } = await import("@/lib/paginate-all");
  return paginateAll(async (page, pageSize) => {
    const result = await listLeadsPaginated({ status, page, pageSize });
    return { items: result.leads, totalPages: result.totalPages };
  });
}

export type LeadListFilters = {
  status?: LeadStatus;
  source?: LeadSource;
  assignee?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  budgetMin?: number;
  page?: number;
  pageSize?: number;
};

export type LeadListResult = {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listLeadsPaginated(filters: LeadListFilters = {}): Promise<LeadListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  try {
    await syncLeadsFromSignedQuotes();
  } catch (error) {
    console.error("[leads] syncLeadsFromSignedQuotes", error);
  }

  return withDb(async (query) => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.status) {
      conditions.push(`status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters.source) {
      conditions.push(`source = $${idx++}`);
      params.push(filters.source);
    }
    if (filters.assignee) {
      if (filters.assignee === "__unassigned__") {
        conditions.push(`(assignee_id IS NULL AND (assignee IS NULL OR TRIM(assignee) = ''))`);
      } else if (/^[0-9a-f-]{36}$/i.test(filters.assignee)) {
        conditions.push(`assignee_id = $${idx++}`);
        params.push(filters.assignee);
      } else {
        conditions.push(`assignee = $${idx++}`);
        params.push(filters.assignee);
      }
    }
    if (filters.dateFrom) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(new Date(`${filters.dateFrom}T00:00:00`));
    }
    if (filters.dateTo) {
      conditions.push(`created_at <= $${idx++}`);
      params.push(new Date(`${filters.dateTo}T23:59:59`));
    }
    if (filters.budgetMin !== undefined && filters.budgetMin > 0) {
      conditions.push(`COALESCE(estimated_value, 0) >= $${idx++}`);
      params.push(filters.budgetMin);
    }
    if (filters.q?.trim()) {
      const pattern = `%${filters.q.trim().replace(/[%_\\]/g, "\\$&")}%`;
      const phoneDigits = filters.q.replace(/\D/g, "");
      if (phoneDigits.length >= 6) {
        conditions.push(
          `(name ILIKE $${idx} OR email ILIKE $${idx} OR company ILIKE $${idx} OR service ILIKE $${idx}
            OR regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') LIKE '%' || $${idx + 1} || '%')`,
        );
        params.push(pattern, phoneDigits);
        idx += 2;
      } else {
        conditions.push(
          `(name ILIKE $${idx} OR email ILIKE $${idx} OR company ILIKE $${idx} OR service ILIKE $${idx})`,
        );
        params.push(pattern);
        idx += 1;
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM leads ${where}`,
      params,
    );
    const total = Number(countRows[0]?.count ?? 0);

    const { rows } = await query<LeadRow>(
      `SELECT * FROM leads ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, pageSize, offset],
    );

    return {
      leads: rows.map(mapLead),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  });
}

export async function listAllLeadsForExport(filters: Omit<LeadListFilters, "page" | "pageSize"> = {}): Promise<Lead[]> {
  const { paginateAll } = await import("@/lib/paginate-all");
  return paginateAll(async (page, pageSize) => {
    const result = await listLeadsPaginated({ ...filters, page, pageSize });
    return { items: result.leads, totalPages: result.totalPages };
  });
}

export async function getLeadById(id: string): Promise<Lead | null> {
  return withDb(async (query) => {
    const { rows } = await query<LeadRow>(`SELECT * FROM leads WHERE id = $1`, [id]);
    return rows[0] ? mapLead(rows[0]) : null;
  });
}

/** Aligne les leads liés à un devis signé/validé/facturé vers le statut « signed ». */
export async function syncLeadsFromSignedQuotes(): Promise<number> {
  return withDb(async (query) => {
    const { rowCount } = await query(
      `UPDATE leads l
       SET status = 'signed', updated_at = NOW()
       FROM quotes q
       WHERE q.lead_id = l.id
         AND q.status IN ('signed', 'accepted', 'validated', 'invoiced')
         AND l.status NOT IN ('signed', 'lost')`,
    );
    return rowCount ?? 0;
  });
}

export async function updateLead(
  id: string,
  input: z.infer<typeof updateLeadSchema>,
): Promise<Lead | null> {
  return withDb(async (query) => {
    const { rows: existingRows } = await query<LeadRow>(
      `SELECT * FROM leads WHERE id = $1`,
      [id],
    );
    const existing = existingRows[0];
    if (!existing) return null;

    const mergedMetadata = input.metadata
      ? { ...(existing.metadata ?? {}), ...input.metadata }
      : existing.metadata ?? {};

    let nextAssignee = existing.assignee;
    let nextAssigneeId = existing.assignee_id;
    if (input.assigneeId !== undefined || input.assignee !== undefined) {
      const { resolveAssigneeInput } = await import("@/lib/crm-assignee");
      const resolved = await resolveAssigneeInput({
        assigneeId: input.assigneeId,
        assignee: input.assignee,
      });
      nextAssignee = resolved.assignee;
      nextAssigneeId = resolved.assigneeId;
    }

    const { rows } = await query<LeadRow>(
      `UPDATE leads SET
        status = $2,
        name = $3,
        phone = $4,
        company = $5,
        service = $6,
        budget = $7,
        timeline = $8,
        message = $9,
        estimated_value = $10,
        assignee = $11,
        assignee_id = $12,
        marketing_opt_in = $13,
        metadata = $14::jsonb,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        input.status ?? existing.status,
        input.name ?? existing.name,
        input.phone !== undefined ? input.phone : existing.phone,
        input.company !== undefined ? input.company : existing.company,
        input.service !== undefined ? input.service : existing.service,
        input.budget !== undefined ? input.budget : existing.budget,
        input.timeline !== undefined ? input.timeline : existing.timeline,
        input.message !== undefined ? input.message : existing.message,
        input.estimatedValue !== undefined ? input.estimatedValue : existing.estimated_value,
        nextAssignee,
        nextAssigneeId,
        input.marketingOptIn !== undefined
          ? input.marketingOptIn
          : Boolean(existing.marketing_opt_in),
        JSON.stringify(mergedMetadata),
      ],
    );

    return rows[0] ? mapLead(rows[0]) : null;
  });
}

export async function deleteLead(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM leads WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function countLeadsByStatus(): Promise<Record<LeadStatus, number>> {
  return withDb(async (query) => {
    const { rows } = await query<{ status: LeadStatus; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM leads GROUP BY status`,
    );

    const counts = Object.fromEntries(
      LEAD_STATUSES.map((s) => [s, 0]),
    ) as Record<LeadStatus, number>;

    for (const row of rows) {
      counts[row.status] = Number(row.count);
    }

    return counts;
  });
}

/** Enregistre un lead sans faire échouer le formulaire public. */
export async function safeCreateLead(input: CreateLeadInput): Promise<void> {
  await createLead(input);
}

export type DuplicateLeadGroup = {
  reason: "email" | "phone";
  key: string;
  leads: Lead[];
};

function normalizeLeadEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeLeadPhone(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

const LEAD_STATUS_MERGE_PRIORITY: Record<LeadStatus, number> = {
  signed: 5,
  quote_sent: 4,
  contacted: 3,
  new: 2,
  lost: 1,
};

function pickMergedLeadStatus(a: LeadStatus, b: LeadStatus): LeadStatus {
  if (a === "lost" && b !== "lost") return b;
  if (b === "lost" && a !== "lost") return a;
  return LEAD_STATUS_MERGE_PRIORITY[a] >= LEAD_STATUS_MERGE_PRIORITY[b] ? a : b;
}

export async function findDuplicateLeadGroups(): Promise<DuplicateLeadGroup[]> {
  const leads = await listLeads();
  const byEmail = new Map<string, Lead[]>();
  const byPhone = new Map<string, Lead[]>();

  for (const lead of leads) {
    const emailKey = normalizeLeadEmail(lead.email);
    if (emailKey) {
      const list = byEmail.get(emailKey) ?? [];
      list.push(lead);
      byEmail.set(emailKey, list);
    }
    const phoneKey = normalizeLeadPhone(lead.phone);
    if (phoneKey) {
      const list = byPhone.get(phoneKey) ?? [];
      list.push(lead);
      byPhone.set(phoneKey, list);
    }
  }

  const groups: DuplicateLeadGroup[] = [];
  for (const [key, list] of byEmail) {
    if (list.length > 1) groups.push({ reason: "email", key, leads: list });
  }
  for (const [key, list] of byPhone) {
    if (list.length > 1) {
      const alreadyGrouped = groups.some(
        (g) => g.reason === "email" && g.leads.every((lead) => list.some((item) => item.id === lead.id)),
      );
      if (!alreadyGrouped) {
        groups.push({ reason: "phone", key, leads: list });
      }
    }
  }
  return groups;
}

export async function mergeLeads(sourceId: string, targetId: string): Promise<Lead | null> {
  if (sourceId === targetId) return null;
  if (!isDatabaseConfigured()) return null;

  return withDbTransaction(async (query) => {
    const { rows: sourceRows } = await query<LeadRow>(`SELECT * FROM leads WHERE id = $1`, [sourceId]);
    const { rows: targetRows } = await query<LeadRow>(`SELECT * FROM leads WHERE id = $1`, [targetId]);
    const source = sourceRows[0];
    const target = targetRows[0];
    if (!source || !target) return null;

    const mergedMessage =
      [target.message, source.message].filter((value) => value?.trim()).join("\n\n---\n\n") || null;
    const mergedMetadata = {
      ...(source.metadata ?? {}),
      ...(target.metadata ?? {}),
      mergedFrom: sourceId,
      mergedSources: [
        ...new Set([
          ...(Array.isArray(target.metadata?.mergedSources) ? (target.metadata.mergedSources as string[]) : []),
          target.source,
          source.source,
        ]),
      ],
    };
    const mergedStatus = pickMergedLeadStatus(target.status, source.status);
    const mergedEstimatedValue = Math.max(target.estimated_value ?? 0, source.estimated_value ?? 0) || null;

    await query(`UPDATE lead_activities SET lead_id = $1 WHERE lead_id = $2`, [targetId, sourceId]);
    await query(`UPDATE tasks SET lead_id = $1 WHERE lead_id = $2`, [targetId, sourceId]);

    const { rows: targetQuoteRows } = await query<{ id: string }>(
      `SELECT id FROM quotes WHERE lead_id = $1 LIMIT 1`,
      [targetId],
    );
    if (targetQuoteRows[0]) {
      await query(`UPDATE quotes SET lead_id = NULL WHERE lead_id = $1`, [sourceId]);
    } else {
      await query(`UPDATE quotes SET lead_id = $1 WHERE lead_id = $2`, [targetId, sourceId]);
    }

    const { rows: targetClientRows } = await query<{ id: string }>(
      `SELECT id FROM clients WHERE lead_id = $1 LIMIT 1`,
      [targetId],
    );
    if (targetClientRows[0]) {
      await query(`UPDATE clients SET lead_id = NULL WHERE lead_id = $1`, [sourceId]);
    } else {
      await query(`UPDATE clients SET lead_id = $1 WHERE lead_id = $2`, [targetId, sourceId]);
    }

    const { rows } = await query<LeadRow>(
      `UPDATE leads SET
        status = $2,
        phone = COALESCE($3, phone),
        company = COALESCE($4, company),
        service = COALESCE($5, service),
        budget = COALESCE($6, budget),
        timeline = COALESCE($7, timeline),
        message = $8,
        estimated_value = $9,
        assignee = COALESCE($10, assignee),
        metadata = $11::jsonb,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        targetId,
        mergedStatus,
        target.phone ?? source.phone,
        target.company ?? source.company,
        target.service ?? source.service,
        target.budget ?? source.budget,
        target.timeline ?? source.timeline,
        mergedMessage,
        mergedEstimatedValue,
        target.assignee ?? source.assignee,
        JSON.stringify(mergedMetadata),
      ],
    );

    await query(
      `INSERT INTO lead_activities (lead_id, type, subject, content, actor_name)
       VALUES ($1, 'note', 'Fusion de leads', $2, NULL)`,
      [
        targetId,
        `Lead fusionné avec ${source.name} (${source.email}, ${LEAD_SOURCE_LABELS[source.source]}) — ID source : ${sourceId}`,
      ],
    );

    await query(`DELETE FROM leads WHERE id = $1`, [sourceId]);

    return rows[0] ? mapLead(rows[0]) : null;
  });
}
