import { z } from "zod";
import { withDb, withDbTransaction, isDatabaseConfigured } from "@/lib/db";
import type { ClientStatus, InteractionType } from "@/content/clients-labels";
import { CLIENT_STATUSES, INTERACTION_TYPES } from "@/content/clients-labels";
import { getLeadById, type Lead } from "@/lib/leads";

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  address: string | null;
  status: ClientStatus;
  portalClientId: string | null;
  leadId: string | null;
  notes: string | null;
  accountManager: string | null;
  sector: string | null;
  tags: string[];
  revenueTotal: number;
  metadata: Record<string, unknown>;
  interactionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ClientInteraction = {
  id: string;
  clientId: string;
  type: InteractionType;
  subject: string | null;
  content: string;
  createdAt: string;
};

type ClientRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  address: string | null;
  status: ClientStatus;
  portal_client_id: string | null;
  lead_id: string | null;
  notes: string | null;
  account_manager: string | null;
  sector: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  interaction_count?: string;
  revenue_total?: string;
};

type InteractionRow = {
  id: string;
  client_id: string;
  type: InteractionType;
  subject: string | null;
  content: string;
  created_at: Date;
};

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    address: row.address,
    status: row.status,
    portalClientId: row.portal_client_id,
    leadId: row.lead_id,
    notes: row.notes,
    accountManager: row.account_manager ?? null,
    sector: row.sector ?? null,
    tags: row.tags ?? [],
    revenueTotal: Number(row.revenue_total ?? 0),
    metadata: row.metadata ?? {},
    interactionCount: Number(row.interaction_count ?? 0),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const CLIENT_LIST_FROM = `
  FROM clients c
  LEFT JOIN client_interactions ci ON ci.client_id = c.id
  LEFT JOIN (
    SELECT client_id, SUM(paid_amount)::bigint AS revenue_total
    FROM invoices
    WHERE client_id IS NOT NULL
    GROUP BY client_id
  ) rev ON rev.client_id = c.id
`;

const CLIENT_LIST_SELECT = `
  SELECT c.*,
    COUNT(DISTINCT ci.id)::text AS interaction_count,
    COALESCE(rev.revenue_total, 0)::text AS revenue_total
  ${CLIENT_LIST_FROM}
`;

function mapInteraction(row: InteractionRow): ClientInteraction {
  return {
    id: row.id,
    clientId: row.client_id,
    type: row.type,
    subject: row.subject,
    content: row.content,
    createdAt: row.created_at.toISOString(),
  };
}

export const createClientSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(50).optional().nullable(),
  company: z.string().trim().max(160).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  status: z.enum(CLIENT_STATUSES).default("active"),
  portalClientId: z
    .string()
    .trim()
    .max(64)
    .regex(/^[a-zA-Z0-9_-]*$/)
    .optional()
    .nullable(),
  leadId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  accountManager: z.string().trim().max(100).optional().nullable(),
  sector: z.string().trim().max(100).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const createInteractionSchema = z.object({
  type: z.enum(INTERACTION_TYPES).default("note"),
  subject: z.string().trim().max(200).optional().nullable(),
  content: z.string().trim().min(1).max(5000),
});

export type ClientListFilters = {
  status?: ClientStatus;
  accountManager?: string;
  sector?: string;
  tag?: string;
  revenueMin?: number;
  revenueMax?: number;
  q?: string;
  page?: number;
  pageSize?: number;
};

export type ClientListResult = {
  clients: Client[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function buildClientFilterClause(filters: ClientListFilters): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.status) {
    conditions.push(`c.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.accountManager) {
    if (filters.accountManager === "__unassigned__") {
      conditions.push(`(c.account_manager IS NULL OR TRIM(c.account_manager) = '')`);
    } else {
      conditions.push(`c.account_manager = $${idx++}`);
      params.push(filters.accountManager);
    }
  }
  if (filters.sector) {
    conditions.push(`c.sector = $${idx++}`);
    params.push(filters.sector);
  }
  if (filters.tag?.trim()) {
    conditions.push(`$${idx++} = ANY(c.tags)`);
    params.push(filters.tag.trim());
  }
  if (filters.revenueMin !== undefined && filters.revenueMin > 0) {
    conditions.push(`COALESCE(rev.revenue_total, 0) >= $${idx++}`);
    params.push(filters.revenueMin);
  }
  if (filters.revenueMax !== undefined && filters.revenueMax > 0) {
    conditions.push(`COALESCE(rev.revenue_total, 0) <= $${idx++}`);
    params.push(filters.revenueMax);
  }
  if (filters.q?.trim()) {
    const pattern = `%${filters.q.trim().replace(/[%_\\]/g, "\\$&")}%`;
    conditions.push(
      `(c.name ILIKE $${idx} OR c.email ILIKE $${idx} OR c.company ILIKE $${idx} OR EXISTS (SELECT 1 FROM unnest(c.tags) t WHERE t ILIKE $${idx}))`,
    );
    params.push(pattern);
    idx += 1;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { where, params };
}

export async function listClients(status?: ClientStatus): Promise<Client[]> {
  const result = await listClientsPaginated(status ? { status, pageSize: 10_000 } : { pageSize: 10_000 });
  return result.clients;
}

export async function listClientsPaginated(filters: ClientListFilters = {}): Promise<ClientListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 50));
  const offset = (page - 1) * pageSize;
  const { where, params } = buildClientFilterClause(filters);

  return withDb(async (query) => {
    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(DISTINCT c.id)::text AS count ${CLIENT_LIST_FROM} ${where}`,
      params,
    );
    const total = Number(countRows[0]?.count ?? 0);

    const { rows } = await query<ClientRow>(
      `${CLIENT_LIST_SELECT} ${where} GROUP BY c.id, rev.revenue_total ORDER BY c.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset],
    );

    return {
      clients: rows.map(mapClient),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  });
}

export async function listClientsFiltered(filters: ClientListFilters = {}): Promise<Client[]> {
  const result = await listClientsPaginated({ ...filters, pageSize: filters.pageSize ?? 10_000 });
  return result.clients;
}

export async function listDistinctClientTags(): Promise<string[]> {
  return withDb(async (query) => {
    const { rows } = await query<{ tag: string }>(
      `SELECT DISTINCT unnest(tags) AS tag FROM clients WHERE array_length(tags, 1) > 0 ORDER BY tag`,
    );
    return rows.map((r) => r.tag);
  });
}

export async function listDistinctClientSectors(): Promise<string[]> {
  return withDb(async (query) => {
    const { rows } = await query<{ sector: string }>(
      `SELECT DISTINCT sector FROM clients WHERE sector IS NOT NULL AND TRIM(sector) != '' ORDER BY sector`,
    );
    return rows.map((r) => r.sector);
  });
}

export async function getClientById(id: string): Promise<Client | null> {
  return withDb(async (query) => {
    const { rows } = await query<ClientRow>(
      `SELECT c.*, COUNT(DISTINCT ci.id)::text AS interaction_count,
        COALESCE(rev.revenue_total, 0)::text AS revenue_total
       FROM clients c
       LEFT JOIN client_interactions ci ON ci.client_id = c.id
       LEFT JOIN (
         SELECT client_id, SUM(paid_amount)::bigint AS revenue_total
         FROM invoices WHERE client_id IS NOT NULL GROUP BY client_id
       ) rev ON rev.client_id = c.id
       WHERE c.id = $1
       GROUP BY c.id, rev.revenue_total`,
      [id],
    );
    return rows[0] ? mapClient(rows[0]) : null;
  });
}

export async function getClientByPortalId(portalClientId: string): Promise<Client | null> {
  return withDb(async (query) => {
    const { rows } = await query<ClientRow>(
      `SELECT c.*, COUNT(DISTINCT ci.id)::text AS interaction_count,
        COALESCE(rev.revenue_total, 0)::text AS revenue_total
       FROM clients c
       LEFT JOIN client_interactions ci ON ci.client_id = c.id
       LEFT JOIN (
         SELECT client_id, SUM(paid_amount)::bigint AS revenue_total
         FROM invoices WHERE client_id IS NOT NULL GROUP BY client_id
       ) rev ON rev.client_id = c.id
       WHERE c.portal_client_id = $1
       GROUP BY c.id, rev.revenue_total`,
      [portalClientId],
    );
    return rows[0] ? mapClient(rows[0]) : null;
  });
}

export async function createClient(
  input: z.infer<typeof createClientSchema>,
): Promise<Client> {
  return withDb(async (query) => {
    const { rows } = await query<ClientRow>(
      `INSERT INTO clients (
        name, email, phone, company, address, status,
        portal_client_id, lead_id, notes, account_manager, sector, tags, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *, '0' AS interaction_count, '0' AS revenue_total`,
      [
        input.name,
        input.email,
        input.phone ?? null,
        input.company ?? null,
        input.address ?? null,
        input.status ?? "active",
        input.portalClientId || null,
        input.leadId ?? null,
        input.notes ?? null,
        input.accountManager ?? null,
        input.sector ?? null,
        input.tags ?? [],
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    return mapClient(rows[0]);
  });
}

export async function updateClient(
  id: string,
  input: z.infer<typeof updateClientSchema>,
): Promise<Client | null> {
  return withDb(async (query) => {
    const { rows: existingRows } = await query<ClientRow>(
      `SELECT * FROM clients WHERE id = $1`,
      [id],
    );
    const existing = existingRows[0];
    if (!existing) return null;

    const nextTags = input.tags !== undefined ? input.tags : (existing.tags ?? []);

    const { rows } = await query<ClientRow>(
      `UPDATE clients SET
        name = $2,
        email = $3,
        phone = $4,
        company = $5,
        address = $6,
        status = $7,
        portal_client_id = $8,
        lead_id = $9,
        notes = $10,
        account_manager = $11,
        sector = $12,
        tags = $13,
        metadata = $14::jsonb,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *, '0' AS interaction_count, '0' AS revenue_total`,
      [
        id,
        input.name ?? existing.name,
        input.email ?? existing.email,
        input.phone !== undefined ? input.phone : existing.phone,
        input.company !== undefined ? input.company : existing.company,
        input.address !== undefined ? input.address : existing.address,
        input.status ?? existing.status,
        input.portalClientId !== undefined ? input.portalClientId || null : existing.portal_client_id,
        input.leadId !== undefined ? input.leadId : existing.lead_id,
        input.notes !== undefined ? input.notes : existing.notes,
        input.accountManager !== undefined ? input.accountManager : existing.account_manager,
        input.sector !== undefined ? input.sector : existing.sector,
        nextTags,
        JSON.stringify(
          input.metadata ? { ...(existing.metadata ?? {}), ...input.metadata } : existing.metadata ?? {},
        ),
      ],
    );

    const client = mapClient(rows[0]);
    const full = await getClientById(client.id);
    return full;
  });
}

export async function deleteClient(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM clients WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export type DuplicateClientGroup = {
  reason: "email" | "company";
  key: string;
  clients: Client[];
};

export async function findDuplicateClientGroups(): Promise<DuplicateClientGroup[]> {
  const clients = await listClientsFiltered();
  const byEmail = new Map<string, Client[]>();
  const byCompany = new Map<string, Client[]>();

  for (const client of clients) {
    const emailKey = client.email.trim().toLowerCase();
    if (emailKey) {
      const list = byEmail.get(emailKey) ?? [];
      list.push(client);
      byEmail.set(emailKey, list);
    }
    const companyKey = client.company?.trim().toLowerCase();
    if (companyKey) {
      const list = byCompany.get(companyKey) ?? [];
      list.push(client);
      byCompany.set(companyKey, list);
    }
  }

  const groups: DuplicateClientGroup[] = [];
  for (const [key, list] of byEmail) {
    if (list.length > 1) groups.push({ reason: "email", key, clients: list });
  }
  for (const [key, list] of byCompany) {
    if (list.length > 1 && !groups.some((g) => g.reason === "email" && g.clients.every((c) => list.some((x) => x.id === c.id)))) {
      groups.push({ reason: "company", key, clients: list });
    }
  }
  return groups;
}

export async function mergeClients(sourceId: string, targetId: string): Promise<Client | null> {
  if (sourceId === targetId) return null;
  if (!isDatabaseConfigured()) return null;

  return withDbTransaction(async (query) => {
    const { rows: sourceRows } = await query<ClientRow>(`SELECT * FROM clients WHERE id = $1`, [sourceId]);
    const { rows: targetRows } = await query<ClientRow>(`SELECT * FROM clients WHERE id = $1`, [targetId]);
    const source = sourceRows[0];
    const target = targetRows[0];
    if (!source || !target) return null;

    const mergedNotes = [target.notes, source.notes].filter(Boolean).join("\n\n---\n\n") || null;
    const mergedTags = [...new Set([...(target.tags ?? []), ...(source.tags ?? [])])];
    const mergedMetadata = { ...(source.metadata ?? {}), ...(target.metadata ?? {}), mergedFrom: sourceId };
    const mergedPortalClientId = target.portal_client_id ?? source.portal_client_id;
    const mergedLeadId = target.lead_id ?? source.lead_id;

    // idx_clients_lead_id est UNIQUE — libérer la source avant d'attacher le lead à la cible.
    if (source.lead_id) {
      await query(`UPDATE clients SET lead_id = NULL WHERE id = $1`, [sourceId]);
    }

    if (source.portal_client_id && source.portal_client_id !== target.portal_client_id && mergedPortalClientId) {
      await query(`UPDATE crm_notifications SET portal_client_id = $1 WHERE portal_client_id = $2`, [
        mergedPortalClientId,
        source.portal_client_id,
      ]);
      if (!target.portal_client_id) {
        await query(`UPDATE support_tickets SET portal_client_id = $1 WHERE portal_client_id = $2`, [
          mergedPortalClientId,
          source.portal_client_id,
        ]);
      }
      await query(`UPDATE clients SET portal_client_id = NULL WHERE id = $1`, [sourceId]);
    }

    await query(`UPDATE client_interactions SET client_id = $1 WHERE client_id = $2`, [targetId, sourceId]);
    await query(`UPDATE projects SET client_id = $1 WHERE client_id = $2`, [targetId, sourceId]);
    await query(`UPDATE quotes SET client_id = $1 WHERE client_id = $2`, [targetId, sourceId]);
    await query(`UPDATE support_tickets SET client_id = $1 WHERE client_id = $2`, [targetId, sourceId]);
    await query(`UPDATE tasks SET client_id = $1 WHERE client_id = $2`, [targetId, sourceId]);
    await query(`UPDATE calendar_events SET client_id = $1 WHERE client_id = $2`, [targetId, sourceId]);
    await query(`UPDATE invoices SET client_id = $1 WHERE client_id = $2`, [targetId, sourceId]);

    await query(
      `UPDATE clients SET
        phone = COALESCE($2, phone),
        company = COALESCE($3, company),
        address = COALESCE($4, address),
        portal_client_id = COALESCE($5, portal_client_id),
        lead_id = COALESCE($6, lead_id),
        notes = $7,
        account_manager = COALESCE($8, account_manager),
        sector = COALESCE($9, sector),
        tags = $10,
        metadata = $11::jsonb,
        updated_at = NOW()
      WHERE id = $1`,
      [
        targetId,
        target.phone ?? source.phone,
        target.company ?? source.company,
        target.address ?? source.address,
        mergedPortalClientId,
        mergedLeadId,
        mergedNotes,
        target.account_manager ?? source.account_manager,
        target.sector ?? source.sector,
        mergedTags,
        JSON.stringify(mergedMetadata),
      ],
    );

    await query(
      `INSERT INTO client_interactions (client_id, type, subject, content)
       VALUES ($1, 'note', 'Fusion de fiches', $2)`,
      [
        targetId,
        `Fiche fusionnée avec ${source.name} (${source.email}) — ID source : ${sourceId}`,
      ],
    );

    await query(`DELETE FROM clients WHERE id = $1`, [sourceId]);

    const { rows } = await query<ClientRow>(
      `SELECT c.*, COUNT(DISTINCT ci.id)::text AS interaction_count,
        COALESCE(rev.revenue_total, 0)::text AS revenue_total
       FROM clients c
       LEFT JOIN client_interactions ci ON ci.client_id = c.id
       LEFT JOIN (
         SELECT client_id, SUM(paid_amount)::bigint AS revenue_total
         FROM invoices WHERE client_id IS NOT NULL GROUP BY client_id
       ) rev ON rev.client_id = c.id
       WHERE c.id = $1
       GROUP BY c.id, rev.revenue_total`,
      [targetId],
    );

    return rows[0] ? mapClient(rows[0]) : null;
  });
}

export async function listClientInteractions(clientId: string): Promise<ClientInteraction[]> {
  return withDb(async (query) => {
    const { rows } = await query<InteractionRow>(
      `SELECT * FROM client_interactions WHERE client_id = $1 ORDER BY created_at DESC`,
      [clientId],
    );
    return rows.map(mapInteraction);
  });
}

export async function addClientInteraction(
  clientId: string,
  input: z.infer<typeof createInteractionSchema>,
): Promise<ClientInteraction> {
  return withDb(async (query) => {
    const { rows } = await query<InteractionRow>(
      `INSERT INTO client_interactions (client_id, type, subject, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [clientId, input.type, input.subject ?? null, input.content],
    );

    await query(`UPDATE clients SET updated_at = NOW() WHERE id = $1`, [clientId]);

    return mapInteraction(rows[0]);
  });
}

export async function createClientFromLead(leadId: string): Promise<Client | null> {
  const lead = await getLeadById(leadId);
  if (!lead) return null;

  return withDb(async (query) => {
    const { rows: existing } = await query<ClientRow>(
      `SELECT * FROM clients WHERE lead_id = $1`,
      [leadId],
    );
    if (existing[0]) return mapClient({ ...existing[0], interaction_count: "0" });

    const company =
      lead.company ||
      lead.name.split(" ").slice(-1)[0] ||
      "Client";

    const portalSlug = company
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);

    const { rows } = await query<ClientRow>(
      `INSERT INTO clients (
        name, email, phone, company, status, portal_client_id, lead_id, notes, metadata
      ) VALUES ($1,$2,$3,$4,'active',$5,$6,$7,$8)
      RETURNING *, '0' AS interaction_count`,
      [
        lead.name,
        lead.email,
        lead.phone,
        lead.company,
        portalSlug || null,
        leadId,
        lead.message,
        JSON.stringify({
          convertedFromLead: true,
          leadSource: lead.source,
          service: lead.service,
          estimatedValue: lead.estimatedValue,
        }),
      ],
    );

    return mapClient(rows[0]);
  });
}

export function leadToClientPreview(lead: Lead) {
  return {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    service: lead.service,
    estimatedValue: lead.estimatedValue,
  };
}

export type ClientOverviewProject = {
  id: string;
  name: string;
  status: string;
  progress: number;
  dueDate: string | null;
};

export type ClientOverviewQuote = {
  id: string;
  reference: string;
  projectLabel: string;
  status: string;
  estimateMax: number | null;
};

export type ClientOverviewTicket = {
  id: string;
  reference: string;
  subject: string;
  status: string;
  priority: string;
};

export type ClientOverviewTask = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
};

export type ClientOverview = {
  projects: ClientOverviewProject[];
  quotes: ClientOverviewQuote[];
  tickets: ClientOverviewTicket[];
  tasks: ClientOverviewTask[];
};

export async function getClientOverview(clientId: string): Promise<ClientOverview> {
  return withDb(async (query) => {
    const { rows: projects } = await query<{
      id: string;
      name: string;
      status: string;
      progress: number;
      due_date: Date | null;
    }>(
      `SELECT id, name, status, progress, due_date FROM projects
       WHERE client_id = $1 ORDER BY updated_at DESC LIMIT 10`,
      [clientId],
    );

    const { rows: quotes } = await query<{
      id: string;
      reference: string;
      project_label: string;
      status: string;
      estimate_max: number | null;
    }>(
      `SELECT id, reference, project_label, status, estimate_max FROM quotes
       WHERE client_id = $1 ORDER BY updated_at DESC LIMIT 10`,
      [clientId],
    );

    const { rows: tickets } = await query<{
      id: string;
      reference: string;
      subject: string;
      status: string;
      priority: string;
    }>(
      `SELECT id, reference, subject, status, priority FROM support_tickets
       WHERE client_id = $1 ORDER BY updated_at DESC LIMIT 10`,
      [clientId],
    );

    const { rows: tasks } = await query<{
      id: string;
      title: string;
      status: string;
      due_date: Date | null;
    }>(
      `SELECT id, title, status, due_date FROM tasks
       WHERE client_id = $1 AND status != 'done'
       ORDER BY due_date ASC NULLS LAST, updated_at DESC LIMIT 10`,
      [clientId],
    );

    return {
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        progress: p.progress,
        dueDate: p.due_date ? p.due_date.toISOString().slice(0, 10) : null,
      })),
      quotes: quotes.map((q) => ({
        id: q.id,
        reference: q.reference,
        projectLabel: q.project_label,
        status: q.status,
        estimateMax: q.estimate_max,
      })),
      tickets: tickets.map((t) => ({
        id: t.id,
        reference: t.reference,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        dueDate: t.due_date ? t.due_date.toISOString().slice(0, 10) : null,
      })),
    };
  });
}
