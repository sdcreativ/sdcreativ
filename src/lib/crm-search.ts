import { withDb, isDatabaseConfigured } from "@/lib/db";
import type { CrmSearchResult } from "@/lib/crm-search-types";

export type { CrmSearchResult, CrmSearchResultType } from "@/lib/crm-search-types";
export { getCrmSearchTypeLabel } from "@/lib/crm-search-types";

export async function searchCrm(query: string, limit = 10): Promise<CrmSearchResult[]> {
  if (!isDatabaseConfigured()) return [];

  const q = query.trim();
  if (q.length < 2) return [];

  const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  const perType = Math.max(3, Math.ceil(limit / 4));

  return withDb(async (run) => {
    const results: CrmSearchResult[] = [];

    const { rows: leads } = await run<{
      id: string;
      name: string;
      email: string;
      company: string | null;
    }>(
      `SELECT id, name, email, company FROM leads
       WHERE name ILIKE $1 OR email ILIKE $1 OR company ILIKE $1 OR service ILIKE $1
       ORDER BY updated_at DESC LIMIT $2`,
      [pattern, perType],
    );

    for (const row of leads) {
      results.push({
        type: "lead",
        id: row.id,
        title: row.name,
        subtitle: row.company ?? row.email,
        href: `/admin/crm/leads?q=${encodeURIComponent(q)}`,
      });
    }

    const { rows: clients } = await run<{
      id: string;
      name: string;
      email: string;
      company: string | null;
    }>(
      `SELECT id, name, email, company FROM clients
       WHERE name ILIKE $1 OR email ILIKE $1 OR company ILIKE $1
       ORDER BY updated_at DESC LIMIT $2`,
      [pattern, perType],
    );

    for (const row of clients) {
      results.push({
        type: "client",
        id: row.id,
        title: row.company ?? row.name,
        subtitle: row.name,
        href: `/admin/crm/clients`,
      });
    }

    const { rows: projects } = await run<{
      id: string;
      name: string;
      client_company: string | null;
      client_name: string;
    }>(
      `SELECT p.id, p.name, c.company AS client_company, c.name AS client_name
       FROM projects p
       JOIN clients c ON c.id = p.client_id
       WHERE p.name ILIKE $1 OR c.name ILIKE $1 OR c.company ILIKE $1
       ORDER BY p.updated_at DESC LIMIT $2`,
      [pattern, perType],
    );

    for (const row of projects) {
      results.push({
        type: "project",
        id: row.id,
        title: row.name,
        subtitle: row.client_company ?? row.client_name,
        href: `/admin/crm/projets/${row.id}`,
      });
    }

    const { rows: quotes } = await run<{
      id: string;
      reference: string;
      project_label: string;
      name: string;
      company: string | null;
    }>(
      `SELECT id, reference, project_label, name, company FROM quotes
       WHERE reference ILIKE $1 OR project_label ILIKE $1 OR name ILIKE $1 OR company ILIKE $1 OR email ILIKE $1
       ORDER BY updated_at DESC LIMIT $2`,
      [pattern, perType],
    );

    for (const row of quotes) {
      results.push({
        type: "quote",
        id: row.id,
        title: row.reference,
        subtitle: row.project_label || row.company || row.name,
        href: `/admin/crm/devis?q=${encodeURIComponent(row.reference)}`,
      });
    }

    return results.slice(0, limit);
  });
}
