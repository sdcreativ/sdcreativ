import { z } from "zod";
import type { QueryResultRow } from "pg";
import { withDb } from "@/lib/db";
import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/content/tickets-labels";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  computeSlaDueAt,
} from "@/content/tickets-labels";

export type Ticket = {
  id: string;
  reference: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  clientId: string | null;
  portalClientId: string | null;
  clientName: string;
  clientEmail: string;
  projectId: string | null;
  projectName: string | null;
  assignee: string | null;
  slaDueAt: string | null;
  resolvedAt: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type TicketMessage = {
  id: string;
  ticketId: string;
  authorType: "client" | "staff";
  authorName: string;
  content: string;
  createdAt: string;
};

type TicketRow = {
  id: string;
  reference: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  client_id: string | null;
  portal_client_id: string | null;
  client_name: string;
  client_email: string;
  project_id: string | null;
  project_name: string | null;
  assignee: string | null;
  sla_due_at: Date | null;
  resolved_at: Date | null;
  message_count?: string;
  last_message_at?: Date | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
};

type MessageRow = {
  id: string;
  ticket_id: string;
  author_type: "client" | "staff";
  author_name: string;
  content: string;
  created_at: Date;
};

const ticketSelect = `
  SELECT t.*,
    p.name AS project_name,
    COUNT(m.id)::text AS message_count,
    MAX(m.created_at) AS last_message_at
  FROM support_tickets t
  LEFT JOIN projects p ON p.id = t.project_id
  LEFT JOIN ticket_messages m ON m.ticket_id = t.id
`;

function mapTicket(row: TicketRow): Ticket {
  return {
    id: row.id,
    reference: row.reference,
    subject: row.subject,
    category: row.category,
    status: row.status,
    priority: row.priority,
    clientId: row.client_id,
    portalClientId: row.portal_client_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    projectId: row.project_id,
    projectName: row.project_name,
    assignee: row.assignee,
    slaDueAt: row.sla_due_at?.toISOString() ?? null,
    resolvedAt: row.resolved_at?.toISOString() ?? null,
    messageCount: Number(row.message_count ?? 0),
    lastMessageAt: row.last_message_at?.toISOString() ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapMessage(row: MessageRow): TicketMessage {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    authorType: row.author_type,
    authorName: row.author_name,
    content: row.content,
    createdAt: row.created_at.toISOString(),
  };
}

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  category: z.enum(TICKET_CATEGORIES).default("technical"),
  priority: z.enum(TICKET_PRIORITIES).default("normal"),
  status: z.enum(TICKET_STATUSES).default("open"),
  clientId: z.string().uuid().optional().nullable(),
  portalClientId: z.string().trim().max(64).optional().nullable(),
  clientName: z.string().trim().min(2).max(160),
  clientEmail: z.string().trim().email().max(255),
  projectId: z.string().uuid().optional().nullable(),
  assignee: z.string().trim().max(100).optional().nullable(),
  initialMessage: z.string().trim().min(1).max(5000),
  authorType: z.enum(["client", "staff"]).default("staff"),
  authorName: z.string().trim().min(1).max(100),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  category: z.enum(TICKET_CATEGORIES).optional(),
  assignee: z.string().trim().max(100).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createMessageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  authorType: z.enum(["client", "staff"]),
  authorName: z.string().trim().min(1).max(100),
  notifyClient: z.boolean().optional(),
});

async function nextReference(
  query: (text: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[]; rowCount: number | null }>,
): Promise<string> {
  const year = new Date().getFullYear();
  const { rows } = await query(
    `SELECT COUNT(*)::text AS count FROM support_tickets WHERE EXTRACT(YEAR FROM created_at) = $1`,
    [year],
  );
  const seq = String(Number((rows[0] as { count: string })?.count ?? 0) + 1).padStart(4, "0");
  return `TKT-${year}-${seq}`;
}

export type TicketListFilters = {
  status?: TicketStatus;
  portalClientId?: string;
  clientId?: string;
  priority?: TicketPriority;
  assignee?: string;
  slaBreached?: boolean;
};

export async function listTickets(filters?: TicketListFilters): Promise<Ticket[]> {
  return withDb(async (query) => {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters?.status) {
      params.push(filters.status);
      conditions.push(`t.status = $${params.length}`);
    }
    if (filters?.portalClientId) {
      params.push(filters.portalClientId);
      conditions.push(`t.portal_client_id = $${params.length}`);
    }
    if (filters?.clientId) {
      params.push(filters.clientId);
      conditions.push(`t.client_id = $${params.length}`);
    }
    if (filters?.priority) {
      params.push(filters.priority);
      conditions.push(`t.priority = $${params.length}`);
    }
    if (filters?.assignee === "__unassigned__") {
      conditions.push(`t.assignee IS NULL`);
    } else if (filters?.assignee) {
      params.push(filters.assignee);
      conditions.push(`t.assignee = $${params.length}`);
    }
    if (filters?.slaBreached === true) {
      conditions.push(`t.sla_due_at < NOW() AND t.status NOT IN ('resolved', 'closed')`);
    } else if (filters?.slaBreached === false) {
      conditions.push(`(t.sla_due_at IS NULL OR t.sla_due_at >= NOW() OR t.status IN ('resolved', 'closed'))`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await query<TicketRow>(
      `${ticketSelect} ${where}
       GROUP BY t.id, p.name
       ORDER BY
         CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
         t.created_at DESC`,
      params,
    );

    return rows.map(mapTicket);
  });
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  return withDb(async (query) => {
    const { rows } = await query<TicketRow>(
      `${ticketSelect} WHERE t.id = $1 GROUP BY t.id, p.name`,
      [id],
    );
    return rows[0] ? mapTicket(rows[0]) : null;
  });
}

export async function createTicket(
  input: z.infer<typeof createTicketSchema>,
): Promise<Ticket> {
  return withDb(async (query) => {
    const reference = await nextReference(query);
    const priority = input.priority ?? "normal";
    const slaDueAt = computeSlaDueAt(priority);

    const { rows } = await query<{ id: string }>(
      `INSERT INTO support_tickets (
        reference, subject, category, status, priority,
        client_id, portal_client_id, client_name, client_email,
        project_id, assignee, sla_due_at, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id`,
      [
        reference,
        input.subject,
        input.category ?? "technical",
        input.status ?? "open",
        priority,
        input.clientId ?? null,
        input.portalClientId ?? null,
        input.clientName,
        input.clientEmail,
        input.projectId ?? null,
        input.assignee ?? null,
        slaDueAt,
        JSON.stringify(input.metadata ?? {}),
      ],
    );

    const ticketId = rows[0].id;

    await query(
      `INSERT INTO ticket_messages (ticket_id, author_type, author_name, content)
       VALUES ($1, $2, $3, $4)`,
      [ticketId, input.authorType, input.authorName, input.initialMessage],
    );

    const full = await getTicketById(ticketId);
    return full!;
  });
}

export async function updateTicket(
  id: string,
  input: z.infer<typeof updateTicketSchema>,
): Promise<Ticket | null> {
  return withDb(async (query) => {
    const { rows: existingRows } = await query<TicketRow>(
      `SELECT * FROM support_tickets WHERE id = $1`,
      [id],
    );
    const existing = existingRows[0];
    if (!existing) return null;

    const nextStatus = input.status ?? existing.status;
    const nextPriority = input.priority ?? existing.priority;
    let resolvedAt = existing.resolved_at;
    let slaDueAt = existing.sla_due_at;

    if (input.priority && input.priority !== existing.priority) {
      slaDueAt = computeSlaDueAt(nextPriority);
    }

    if ((nextStatus === "resolved" || nextStatus === "closed") && !existing.resolved_at) {
      resolvedAt = new Date();
    } else if (nextStatus !== "resolved" && nextStatus !== "closed") {
      resolvedAt = null;
    }

    await query(
      `UPDATE support_tickets SET
        status = $2,
        priority = $3,
        category = $4,
        assignee = $5,
        sla_due_at = $6,
        resolved_at = $7,
        metadata = $8::jsonb,
        updated_at = NOW()
      WHERE id = $1`,
      [
        id,
        nextStatus,
        nextPriority,
        input.category ?? existing.category,
        input.assignee !== undefined ? input.assignee : existing.assignee,
        slaDueAt,
        resolvedAt,
        JSON.stringify(
          input.metadata
            ? { ...(existing.metadata ?? {}), ...input.metadata }
            : existing.metadata ?? {},
        ),
      ],
    );

    return getTicketById(id);
  });
}

export async function deleteTicket(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM support_tickets WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function listTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  return withDb(async (query) => {
    const { rows } = await query<MessageRow>(
      `SELECT * FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [ticketId],
    );
    return rows.map(mapMessage);
  });
}

export async function addTicketMessage(
  ticketId: string,
  input: z.infer<typeof createMessageSchema>,
): Promise<TicketMessage> {
  return withDb(async (query) => {
    const { rows } = await query<MessageRow>(
      `INSERT INTO ticket_messages (ticket_id, author_type, author_name, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [ticketId, input.authorType, input.authorName, input.content],
    );

    const nextStatus =
      input.authorType === "staff" ? "waiting_client" : "in_progress";

    await query(
      `UPDATE support_tickets SET status = $2, updated_at = NOW() WHERE id = $1 AND status NOT IN ('resolved', 'closed')`,
      [ticketId, nextStatus],
    );

    return mapMessage(rows[0]);
  });
}

export async function getTicketStats(): Promise<{
  total: number;
  open: number;
  inProgress: number;
  slaBreached: number;
  resolved: number;
}> {
  return withDb(async (query) => {
    const { rows } = await query<{ status: TicketStatus; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM support_tickets GROUP BY status`,
    );

    const counts: Record<string, number> = {};
    for (const row of rows) counts[row.status] = Number(row.count);

    const { rows: slaRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM support_tickets
       WHERE sla_due_at < NOW() AND status NOT IN ('resolved', 'closed')`,
    );

    const open = counts.open ?? 0;
    const inProgress = (counts.in_progress ?? 0) + (counts.waiting_client ?? 0);
    const resolved = (counts.resolved ?? 0) + (counts.closed ?? 0);
    const total = open + inProgress + resolved;

    return {
      total,
      open,
      inProgress,
      slaBreached: Number(slaRows[0]?.count ?? 0),
      resolved,
    };
  });
}
