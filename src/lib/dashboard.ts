import { withDb } from "@/lib/db";
import { getReportsSummary } from "@/lib/reports";
import type { DashboardPeriod } from "@/content/reports-labels";
import { LEAD_PIPELINE_COLUMNS } from "@/content/leads-labels";
import { PROJECT_TYPE_LABELS, type ProjectStatus } from "@/content/projects-labels";
import { formatTaskDate } from "@/content/tasks-labels";
import {
  buildDashboardKpis,
  formatRelativeTime,
  projectDisplayStatus,
  type DashboardActivity,
  type DashboardKpi,
  type DashboardPipelineColumn,
} from "@/lib/dashboard-utils";
import type { ReportsSummary } from "@/lib/reports";

export type DashboardSnapshot = {
  kpis: DashboardKpi[];
  reports: ReportsSummary | null;
  pipeline: DashboardPipelineColumn[];
  openTasks: Array<{ id: string; label: string; due: string; done: boolean }>;
  recentProjects: Array<{
    id: string;
    name: string;
    type: string;
    status: "EN COURS" | "EN TEST" | "TERMINÉ";
    progress: number;
    href: string;
  }>;
  activities: DashboardActivity[];
};

type DashboardFilters = {
  assignee?: string;
  clientId?: string;
};

function assigneeLeadClause(
  filters: DashboardFilters,
  params: unknown[],
  alias = "l",
): string {
  if (!filters.assignee) return "";
  const idx = params.length + 1;
  if (/^[0-9a-f-]{36}$/i.test(filters.assignee)) {
    params.push(filters.assignee);
    return ` AND ${alias}.assignee_id = $${idx}`;
  }
  params.push(filters.assignee);
  return ` AND ${alias}.assignee = $${idx}`;
}

function assigneeGenericClause(
  filters: DashboardFilters,
  params: unknown[],
  alias: string,
): string {
  if (!filters.assignee) return "";
  const idx = params.length + 1;
  if (/^[0-9a-f-]{36}$/i.test(filters.assignee)) {
    params.push(filters.assignee);
    return ` AND ${alias}.assignee_id = $${idx}`;
  }
  params.push(filters.assignee);
  return ` AND ${alias}.assignee = $${idx}`;
}

function clientClause(filters: DashboardFilters, params: unknown[], column: string): string {
  if (!filters.clientId) return "";
  const idx = params.length + 1;
  params.push(filters.clientId);
  return ` AND ${column} = $${idx}`;
}

export async function getDashboardSnapshot(
  period: DashboardPeriod,
  filters: DashboardFilters = {},
  options?: {
    includeReports?: boolean;
    includePipeline?: boolean;
    includeTasks?: boolean;
    includeProjects?: boolean;
    includeActivities?: boolean;
  },
): Promise<DashboardSnapshot> {
  const includeReports = options?.includeReports ?? true;
  const includePipeline = options?.includePipeline ?? true;
  const includeTasks = options?.includeTasks ?? true;
  const includeProjects = options?.includeProjects ?? true;
  const includeActivities = options?.includeActivities ?? true;

  const reports = includeReports
    ? await getReportsSummary(period, {
        assignee: filters.assignee,
        clientId: filters.clientId,
      })
    : null;

  const kpis = reports
    ? buildDashboardKpis({
        reports: reports.kpis,
        periodLabel: reports.period.label,
      })
    : [];

  return withDb(async (query) => {
    let pipeline: DashboardPipelineColumn[] = [];
    if (includePipeline) {
      const countParams: unknown[] = [];
      const leadFilter = assigneeLeadClause(filters, countParams);
      const { rows: countRows } = await query<{ status: string; count: string }>(
        `SELECT status, COUNT(*)::text AS count
         FROM leads l
         WHERE l.status <> 'lost'${leadFilter}
         GROUP BY status`,
        countParams,
      );
      const counts = Object.fromEntries(countRows.map((r) => [r.status, Number(r.count)]));

      pipeline = await Promise.all(
        LEAD_PIPELINE_COLUMNS.map(async ({ status, title }) => {
          const params: unknown[] = [status];
          const filter = assigneeLeadClause(filters, params);
          const { rows } = await query<{
            id: string;
            title: string;
            subtitle: string | null;
            created_at: Date;
          }>(
            `SELECT l.id,
                    COALESCE(NULLIF(l.company, ''), l.name) AS title,
                    l.service AS subtitle,
                    l.created_at
             FROM leads l
             WHERE l.status = $1${filter}
             ORDER BY l.updated_at DESC
             LIMIT 3`,
            params,
          );

          return {
            id: status,
            title,
            count: counts[status] ?? 0,
            cards: rows.map((row) => ({
              id: row.id,
              title: row.title,
              subtitle: row.subtitle || "Projet web",
              meta: formatRelativeTime(row.created_at.toISOString()),
              badge: status === "new" ? "Nouveau" : status === "signed" ? "Gagné" : undefined,
              href: `/admin/crm/leads?id=${row.id}`,
            })),
          };
        }),
      );
    }

    let openTasks: DashboardSnapshot["openTasks"] = [];
    if (includeTasks) {
      const params: unknown[] = [];
      const filter =
        assigneeGenericClause(filters, params, "t") +
        clientClause(filters, params, "t.client_id");
      const { rows } = await query<{
        id: string;
        title: string;
        due_date: string | null;
        status: string;
      }>(
        `SELECT t.id, t.title, t.due_date::text, t.status
         FROM tasks t
         WHERE t.status <> 'done'${filter}
         ORDER BY t.due_date ASC NULLS LAST, t.created_at ASC
         LIMIT 5`,
        params,
      );
      openTasks = rows.map((t) => ({
        id: t.id,
        label: t.title,
        due: t.due_date ? formatTaskDate(t.due_date) : "Sans échéance",
        done: t.status === "done",
      }));
    }

    let recentProjects: DashboardSnapshot["recentProjects"] = [];
    if (includeProjects) {
      const params: unknown[] = [];
      const filter =
        assigneeGenericClause(filters, params, "p") +
        clientClause(filters, params, "p.client_id");
      const { rows } = await query<{
        id: string;
        name: string;
        type: string;
        status: ProjectStatus;
        progress: number;
      }>(
        `SELECT p.id, p.name, p.type, p.status, p.progress
         FROM projects p
         WHERE 1=1${filter}
         ORDER BY p.updated_at DESC
         LIMIT 5`,
        params,
      );
      recentProjects = rows.map((p) => ({
        id: p.id,
        name: p.name,
        type: PROJECT_TYPE_LABELS[p.type as keyof typeof PROJECT_TYPE_LABELS] ?? p.type,
        status: projectDisplayStatus(p.status),
        progress: p.progress,
        href: `/admin/crm/projets/${p.id}`,
      }));
    }

    let activities: DashboardActivity[] = [];
    if (includeActivities) {
      const items: Array<DashboardActivity & { at: number }> = [];

      {
        const params: unknown[] = [];
        const filter =
          assigneeGenericClause(filters, params, "p") +
          clientClause(filters, params, "p.client_id");
        const { rows } = await query<{
          id: string;
          name: string;
          status: string;
          updated_at: Date;
        }>(
          `SELECT p.id, p.name, p.status, p.updated_at
           FROM projects p
           WHERE 1=1${filter}
           ORDER BY p.updated_at DESC
           LIMIT 10`,
          params,
        );
        for (const project of rows) {
          items.push({
            id: `project-${project.id}`,
            title: project.status === "delivered" ? "Projet livré" : "Projet mis à jour",
            subtitle: project.name,
            time: formatRelativeTime(project.updated_at.toISOString()),
            href: `/admin/crm/projets/${project.id}`,
            at: project.updated_at.getTime(),
          });
        }
      }

      {
        const params: unknown[] = [];
        const conditions = [`q.status = 'accepted'`];
        if (filters.clientId) {
          params.push(filters.clientId);
          conditions.push(`q.client_id = $${params.length}`);
        }
        if (filters.assignee) {
          if (/^[0-9a-f-]{36}$/i.test(filters.assignee)) {
            params.push(filters.assignee);
            conditions.push(
              `EXISTS (SELECT 1 FROM leads l WHERE l.id = q.lead_id AND l.assignee_id = $${params.length})`,
            );
          } else {
            params.push(filters.assignee);
            conditions.push(
              `EXISTS (SELECT 1 FROM leads l WHERE l.id = q.lead_id AND l.assignee = $${params.length})`,
            );
          }
        }
        const { rows } = await query<{
          id: string;
          label: string | null;
          updated_at: Date;
        }>(
          `SELECT q.id,
                  COALESCE(NULLIF(q.company, ''), NULLIF(q.name, ''), q.project_label) AS label,
                  q.updated_at
           FROM quotes q
           WHERE ${conditions.join(" AND ")}
           ORDER BY q.updated_at DESC
           LIMIT 5`,
          params,
        );
        for (const quote of rows) {
          items.push({
            id: `quote-${quote.id}`,
            title: "Devis accepté",
            subtitle: quote.label || "Devis",
            time: formatRelativeTime(quote.updated_at.toISOString()),
            href: `/admin/crm/devis?id=${quote.id}`,
            at: quote.updated_at.getTime(),
          });
        }
      }

      {
        const params: unknown[] = [];
        const leadFilter = assigneeLeadClause(filters, params);
        const { rows } = await query<{
          id: string;
          label: string;
          status: string;
          created_at: Date;
        }>(
          `SELECT l.id,
                  COALESCE(NULLIF(l.company, ''), l.name) AS label,
                  l.status,
                  l.created_at
           FROM leads l
           WHERE l.status IN ('new', 'signed')${leadFilter}
           ORDER BY l.created_at DESC
           LIMIT 5`,
          params,
        );
        for (const lead of rows) {
          items.push({
            id: `lead-${lead.id}`,
            title: lead.status === "signed" ? "Lead signé" : "Nouveau lead",
            subtitle: lead.label,
            time: formatRelativeTime(lead.created_at.toISOString()),
            href: `/admin/crm/leads?id=${lead.id}`,
            at: lead.created_at.getTime(),
          });
        }
      }

      {
        const params: unknown[] = [];
        const filter =
          assigneeGenericClause(filters, params, "t") +
          clientClause(filters, params, "t.client_id");
        const { rows } = await query<{
          id: string;
          title: string;
          completed_at: Date | null;
          updated_at: Date;
        }>(
          `SELECT t.id, t.title, t.completed_at, t.updated_at
           FROM tasks t
           WHERE t.status = 'done'${filter}
           ORDER BY COALESCE(t.completed_at, t.updated_at) DESC
           LIMIT 5`,
          params,
        );
        for (const task of rows) {
          const at = task.completed_at ?? task.updated_at;
          items.push({
            id: `task-${task.id}`,
            title: "Tâche terminée",
            subtitle: task.title,
            time: formatRelativeTime(at.toISOString()),
            href: `/admin/crm/taches?task=${task.id}`,
            at: at.getTime(),
          });
        }
      }

      activities = items
        .sort((a, b) => b.at - a.at)
        .slice(0, 6)
        .map(({ at, ...rest }) => {
          void at;
          return rest;
        });
    }

    return {
      kpis,
      reports,
      pipeline,
      openTasks,
      recentProjects,
      activities,
    };
  });
}
