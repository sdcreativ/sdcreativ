import type { ReportPeriod } from "@/content/reports-labels";
import { withDb } from "@/lib/db";
import type { LeadSource, LeadStatus } from "@/lib/leads";
import type { QuoteStatus } from "@/content/quotes-labels";
import { resolvePeriod, type ReportsFilters } from "@/lib/reports";

export type DrilldownEntity = "leads" | "quotes" | "projects" | "tasks";

export type DrilldownItem = {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  amount: number | null;
};

export type DrilldownParams = {
  entity: DrilldownEntity;
  key: string;
  period: ReportPeriod;
  filters?: ReportsFilters;
  limit?: number;
};

export function getDrilldownListHref(entity: DrilldownEntity, key: string): string {
  switch (entity) {
    case "leads":
      return `/admin/crm/leads?status=${encodeURIComponent(key)}`;
    case "quotes":
      return `/admin/crm/devis?status=${encodeURIComponent(key)}`;
    case "projects":
      return `/admin/crm/projets?status=${encodeURIComponent(key)}`;
    case "tasks":
      return `/admin/crm/taches?assignee=${encodeURIComponent(key)}`;
  }
}

export async function getReportDrilldown({
  entity,
  key,
  period,
  filters = {},
  limit = 25,
}: DrilldownParams): Promise<DrilldownItem[]> {
  const { from, to } = resolvePeriod(period);

  return withDb(async (query) => {
    if (entity === "leads") {
      const params: unknown[] = [key as LeadStatus];
      let clause = "status = $1";
      if (from) {
        params.push(from, to);
        clause += ` AND created_at >= $${params.length - 1} AND created_at <= $${params.length}`;
      }
      if (filters.assignee) {
        params.push(filters.assignee);
        clause += ` AND assignee = $${params.length}`;
      }
      params.push(limit);
      const { rows } = await query<{
        id: string;
        name: string;
        company: string | null;
        estimated_value: string | null;
      }>(
        `SELECT id, name, company, estimated_value::text
         FROM leads WHERE ${clause}
         ORDER BY created_at DESC LIMIT $${params.length}`,
        params,
      );
      return rows.map((row) => ({
        id: row.id,
        title: row.name,
        subtitle: row.company,
        href: `/admin/crm/leads?status=${encodeURIComponent(key)}&q=${encodeURIComponent(row.name)}`,
        amount: row.estimated_value ? Number(row.estimated_value) : null,
      }));
    }

    if (entity === "quotes") {
      const params: unknown[] = [key as QuoteStatus];
      let clause = "q.status = $1";
      if (from) {
        params.push(from, to);
        clause += ` AND q.created_at >= $${params.length - 1} AND q.created_at <= $${params.length}`;
      }
      if (filters.clientId) {
        params.push(filters.clientId);
        clause += ` AND q.client_id = $${params.length}`;
      }
      params.push(limit);
      const { rows } = await query<{
        id: string;
        reference: string;
        client_name: string | null;
        subtotal: string;
      }>(
        `SELECT q.id, q.reference, c.name AS client_name, q.subtotal::text
         FROM quotes q
         LEFT JOIN clients c ON c.id = q.client_id
         WHERE ${clause}
         ORDER BY q.created_at DESC LIMIT $${params.length}`,
        params,
      );
      return rows.map((row) => ({
        id: row.id,
        title: row.reference,
        subtitle: row.client_name,
        href: `/admin/crm/devis?status=${encodeURIComponent(key)}&q=${encodeURIComponent(row.reference)}`,
        amount: Number(row.subtotal),
      }));
    }

    if (entity === "projects") {
      const params: unknown[] = [key];
      let clause = "p.status = $1";
      if (from) {
        params.push(from, to);
        clause += ` AND p.updated_at >= $${params.length - 1} AND p.updated_at <= $${params.length}`;
      }
      if (filters.assignee) {
        params.push(filters.assignee);
        clause += ` AND p.assignee = $${params.length}`;
      }
      if (filters.clientId) {
        params.push(filters.clientId);
        clause += ` AND p.client_id = $${params.length}`;
      }
      params.push(limit);
      const { rows } = await query<{
        id: string;
        name: string;
        client_name: string | null;
        budget: string | null;
      }>(
        `SELECT p.id, p.name, c.name AS client_name, p.budget::text
         FROM projects p
         LEFT JOIN clients c ON c.id = p.client_id
         WHERE ${clause}
         ORDER BY p.updated_at DESC LIMIT $${params.length}`,
        params,
      );
      return rows.map((row) => ({
        id: row.id,
        title: row.name,
        subtitle: row.client_name,
        href: `/admin/crm/projets/${row.id}`,
        amount: row.budget ? Number(row.budget) : null,
      }));
    }

    const { rows } = await query<{
      id: string;
      title: string;
      assignee: string | null;
      due_date: Date | null;
    }>(
      `SELECT id, title, assignee, due_date
       FROM tasks
       WHERE COALESCE(NULLIF(TRIM(assignee), ''), 'Non assigné') = $1
         AND status != 'done'
       ORDER BY due_date ASC NULLS LAST, created_at DESC
       LIMIT $2`,
      [key, limit],
    );
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: row.due_date
        ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(row.due_date)
        : null,
      href: `/admin/crm/taches?assignee=${encodeURIComponent(key)}&q=${encodeURIComponent(row.title)}`,
      amount: null,
    }));
  });
}

export async function getLeadsBySourceDrilldown(
  source: LeadSource,
  period: ReportPeriod,
  limit = 25,
): Promise<DrilldownItem[]> {
  const { from, to } = resolvePeriod(period);
  const params: unknown[] = [source];
  let clause = "source = $1";
  if (from) {
    params.push(from, to);
    clause += ` AND created_at >= $${params.length - 1} AND created_at <= $${params.length}`;
  }
  params.push(limit);

  return withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      name: string;
      company: string | null;
      estimated_value: string | null;
    }>(
      `SELECT id, name, company, estimated_value::text
       FROM leads WHERE ${clause}
       ORDER BY created_at DESC LIMIT $${params.length}`,
      params,
    );
    return rows.map((row) => ({
      id: row.id,
      title: row.name,
      subtitle: row.company,
      href: `/admin/crm/leads?source=${encodeURIComponent(source)}&q=${encodeURIComponent(row.name)}`,
      amount: row.estimated_value ? Number(row.estimated_value) : null,
    }));
  });
}
