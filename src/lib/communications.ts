/**
 * Liste des événements communication_events (3CX) pour le CRM.
 */

import { withDb, isDatabaseConfigured } from "@/lib/db";
import type {
  CommunicationChannel,
  CommunicationDirection,
  CommunicationEvent,
} from "@/lib/threecx/journal";

export type CommunicationListFilters = {
  channel?: CommunicationChannel | "all";
  leadId?: string;
  clientId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

export type CommunicationListItem = CommunicationEvent & {
  leadName: string | null;
  clientName: string | null;
};

type EventRow = {
  id: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  external_id: string;
  lead_id: string | null;
  client_id: string | null;
  agent_extension: string | null;
  started_at: Date | null;
  ended_at: Date | null;
  duration_sec: number | null;
  disposition: string | null;
  summary: string | null;
  created_at: Date;
  lead_name: string | null;
  client_name: string | null;
};

function mapRow(row: EventRow): CommunicationListItem {
  return {
    id: row.id,
    channel: row.channel,
    direction: row.direction,
    externalId: row.external_id,
    leadId: row.lead_id,
    clientId: row.client_id,
    agentExtension: row.agent_extension,
    startedAt: row.started_at?.toISOString() ?? null,
    endedAt: row.ended_at?.toISOString() ?? null,
    durationSec: row.duration_sec,
    disposition: row.disposition,
    summary: row.summary,
    createdAt: row.created_at.toISOString(),
    duplicate: false,
    leadName: row.lead_name,
    clientName: row.client_name,
  };
}

export async function listCommunicationEvents(
  filters: CommunicationListFilters = {},
): Promise<{ items: CommunicationListItem[]; total: number; page: number; pageSize: number }> {
  if (!isDatabaseConfigured()) {
    return { items: [], total: 0, page: 1, pageSize: 20 };
  }

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  return withDb(async (query) => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.channel && filters.channel !== "all") {
      conditions.push(`e.channel = $${idx}`);
      params.push(filters.channel);
      idx += 1;
    }
    if (filters.leadId) {
      conditions.push(`e.lead_id = $${idx}`);
      params.push(filters.leadId);
      idx += 1;
    }
    if (filters.clientId) {
      conditions.push(`e.client_id = $${idx}`);
      params.push(filters.clientId);
      idx += 1;
    }
    if (filters.q?.trim()) {
      const pattern = `%${filters.q.trim().replace(/[%_\\]/g, "\\$&")}%`;
      conditions.push(
        `(e.summary ILIKE $${idx} OR e.agent_extension ILIKE $${idx} OR e.external_id ILIKE $${idx}
          OR COALESCE(l.name, '') ILIKE $${idx} OR COALESCE(c.name, '') ILIKE $${idx})`,
      );
      params.push(pattern);
      idx += 1;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM communication_events e
       LEFT JOIN leads l ON l.id = e.lead_id
       LEFT JOIN clients c ON c.id = e.client_id
       ${where}`,
      params,
    );
    const total = Number(countRows[0]?.count ?? 0);

    const { rows } = await query<EventRow>(
      `SELECT e.*, l.name AS lead_name, c.name AS client_name
       FROM communication_events e
       LEFT JOIN leads l ON l.id = e.lead_id
       LEFT JOIN clients c ON c.id = e.client_id
       ${where}
       ORDER BY COALESCE(e.started_at, e.created_at) DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, pageSize, offset],
    );

    return {
      items: rows.map(mapRow),
      total,
      page,
      pageSize,
    };
  });
}

/** URL Web Client 3CX (env). */
export function getThreeCxWebClientUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_THREE_CX_WEB_CLIENT_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const fqdn =
    process.env.NEXT_PUBLIC_THREE_CX_PBX_FQDN?.trim() ||
    process.env.THREE_CX_PBX_FQDN?.trim();
  if (!fqdn) return null;
  const host = fqdn.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return `https://${host}`;
}
