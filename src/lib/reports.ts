import { withDb } from "@/lib/db";
import type { LeadSource, LeadStatus } from "@/lib/leads";
import { LEAD_STATUSES } from "@/lib/leads";
import type { QuoteStatus } from "@/content/quotes-labels";
import type { ReportPeriod } from "@/content/reports-labels";

export type ReportsPeriodRange = {
  from: string;
  to: string;
  label: string;
};

export type ReportsDateRange = {
  from: Date | null;
  to: Date;
  label: string;
};

export type ReportsKpis = {
  newLeads: number;
  signedLeads: number;
  leadConversionRate: number;
  quotesSent: number;
  quotesAccepted: number;
  quoteConversionRate: number;
  revenueQuotes: number;
  revenueProjects: number;
  pipelineValue: number;
  pipelineForecast: number;
  marginEstimate: number;
  profitabilityRate: number;
  activeProjects: number;
  deliveredProjects: number;
  activeClients: number;
  ticketsResolved: number;
};

export type ReportsFilters = {
  assignee?: string;
  clientId?: string;
};

export type PipelineRow = {
  key: string;
  count: number;
  amount: number;
};

export type SourceRow = {
  source: LeadSource;
  count: number;
  amount: number;
};

export type MonthlyTrendRow = {
  month: string;
  leads: number;
  signedLeads: number;
  quotesSent: number;
  quotesAccepted: number;
  revenue: number;
};

export type TeamWorkloadRow = {
  assignee: string;
  openTasks: number;
  overdueTasks: number;
};

export type ReportsSummary = {
  period: ReportsPeriodRange;
  kpis: ReportsKpis;
  leadPipeline: PipelineRow[];
  quotePipeline: PipelineRow[];
  leadsBySource: SourceRow[];
  monthlyTrend: MonthlyTrendRow[];
  teamWorkload: TeamWorkloadRow[];
};

export function resolvePeriod(period: ReportPeriod): ReportsDateRange {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (period === "all") {
    return { from: null, to, label: "Tout" };
  }

  if (period === "week") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    from.setHours(0, 0, 0, 0);
    const label = `Semaine du ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(from)}`;
    return { from, to, label };
  }

  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(from);
    return { from, to, label };
  }

  if (period === "quarter") {
    const quarterStart = Math.floor(now.getMonth() / 3) * 3;
    const from = new Date(now.getFullYear(), quarterStart, 1);
    const label = `T${Math.floor(quarterStart / 3) + 1} ${now.getFullYear()}`;
    return { from, to, label };
  }

  const from = new Date(now.getFullYear(), 0, 1);
  return { from, to, label: String(now.getFullYear()) };
}

export function resolvePreviousPeriod(period: ReportPeriod): ReportsDateRange | null {
  const current = resolvePeriod(period);
  if (!current.from || period === "all") return null;

  if (period === "week") {
    const from = new Date(current.from);
    from.setDate(from.getDate() - 7);
    const to = new Date(current.from);
    to.setMilliseconds(to.getMilliseconds() - 1);
    return {
      from,
      to,
      label: "Semaine précédente",
    };
  }

  if (period === "month") {
    const from = new Date(current.from.getFullYear(), current.from.getMonth() - 1, 1);
    const to = new Date(current.from.getFullYear(), current.from.getMonth(), 0, 23, 59, 59, 999);
    return {
      from,
      to,
      label: new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(from),
    };
  }

  if (period === "quarter") {
    const from = new Date(current.from);
    from.setMonth(from.getMonth() - 3);
    const to = new Date(current.from);
    to.setMilliseconds(to.getMilliseconds() - 1);
    const quarter = Math.floor(from.getMonth() / 3) + 1;
    return {
      from,
      to,
      label: `T${quarter} ${from.getFullYear()}`,
    };
  }

  const from = new Date(current.from.getFullYear() - 1, 0, 1);
  const to = new Date(current.from.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
  return { from, to, label: String(from.getFullYear()) };
}

function dateFilter(column: string, from: Date | null, to: Date, startIndex = 1): { clause: string; params: Date[] } {
  if (!from) return { clause: "", params: [] };
  return {
    clause: ` AND ${column} >= $${startIndex} AND ${column} <= $${startIndex + 1}`,
    params: [from, to],
  };
}

function appendAssigneeFilter(
  clause: string,
  params: unknown[],
  assignee?: string,
): { clause: string; params: unknown[] } {
  if (!assignee) return { clause, params };
  return {
    clause: `${clause} AND assignee = $${params.length + 1}`,
    params: [...params, assignee],
  };
}

function appendClientFilter(
  clause: string,
  params: unknown[],
  clientId?: string,
): { clause: string; params: unknown[] } {
  if (!clientId) return { clause, params };
  return {
    clause: `${clause} AND client_id = $${params.length + 1}`,
    params: [...params, clientId],
  };
}

function leadQueryFilters(from: Date | null, to: Date, filters: ReportsFilters) {
  const date = dateFilter("created_at", from, to);
  let params: unknown[] = [...date.params];
  let clause = date.clause;
  ({ clause, params } = appendAssigneeFilter(clause, params, filters.assignee));
  return { clause, params };
}

function quoteQueryFilters(from: Date | null, to: Date, filters: ReportsFilters) {
  const date = dateFilter("created_at", from, to);
  let params: unknown[] = [...date.params];
  let clause = date.clause;
  ({ clause, params } = appendClientFilter(clause, params, filters.clientId));
  return { clause, params };
}

function projectQueryFilters(from: Date | null, to: Date, filters: ReportsFilters) {
  const date = dateFilter("updated_at", from, to);
  let params: unknown[] = [...date.params];
  let clause = date.clause;
  ({ clause, params } = appendAssigneeFilter(clause, params, filters.assignee));
  ({ clause, params } = appendClientFilter(clause, params, filters.clientId));
  return { clause, params };
}

function leadOnlyFilters(filters: ReportsFilters) {
  let params: unknown[] = [];
  let clause = "";
  ({ clause, params } = appendAssigneeFilter(clause, params, filters.assignee));
  return { clause, params };
}

function quoteOnlyFilters(filters: ReportsFilters) {
  let params: unknown[] = [];
  let clause = "";
  ({ clause, params } = appendClientFilter(clause, params, filters.clientId));
  return { clause, params };
}

function projectOnlyFilters(filters: ReportsFilters) {
  let params: unknown[] = [];
  let clause = "";
  ({ clause, params } = appendAssigneeFilter(clause, params, filters.assignee));
  ({ clause, params } = appendClientFilter(clause, params, filters.clientId));
  return { clause, params };
}

export type ReportsComparisonMetric = {
  key: keyof ReportsKpis;
  label: string;
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number | null;
};

export type ReportsComparison = {
  previousPeriodLabel: string;
  metrics: ReportsComparisonMetric[];
};

const COMPARISON_KPI_KEYS: Array<{ key: keyof ReportsKpis; label: string }> = [
  { key: "newLeads", label: "Nouveaux leads" },
  { key: "signedLeads", label: "Leads signés" },
  { key: "quotesAccepted", label: "Devis acceptés" },
  { key: "revenueQuotes", label: "CA devis" },
  { key: "revenueProjects", label: "CA projets" },
  { key: "pipelineValue", label: "Pipeline leads" },
];

export function buildReportsComparison(
  current: ReportsKpis,
  previous: ReportsKpis,
  previousPeriodLabel: string,
): ReportsComparison {
  return {
    previousPeriodLabel,
    metrics: COMPARISON_KPI_KEYS.map(({ key, label }) => {
      const cur = current[key];
      const prev = previous[key];
      const delta = cur - prev;
      const deltaPercent = prev !== 0 ? Math.round((delta / prev) * 100) : null;
      return { key, label, current: cur, previous: prev, delta, deltaPercent };
    }),
  };
}

export async function getReportsSummary(
  period: ReportPeriod = "month",
  filters: ReportsFilters = {},
  rangeOverride?: ReportsDateRange,
): Promise<ReportsSummary> {
  const { from, to, label } = rangeOverride ?? resolvePeriod(period);

  return withDb(async (query) => {
    const leadQ = leadQueryFilters(from, to, filters);
    const quoteQ = quoteQueryFilters(from, to, filters);
    const revenueQuoteQ = quoteQueryFilters(from, to, filters);
    const revenueProjectQ = projectQueryFilters(from, to, filters);
    const leadStatic = leadOnlyFilters(filters);
    const quoteStatic = quoteOnlyFilters(filters);
    const projectStatic = projectOnlyFilters(filters);

    const { rows: leadRows } = await query<{ status: LeadStatus; count: string; value: string }>(
      `SELECT status, COUNT(*)::text AS count,
              COALESCE(SUM(estimated_value), 0)::text AS value
       FROM leads
       WHERE 1=1${leadQ.clause}
       GROUP BY status`,
      leadQ.params,
    );

    const leadCounts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
    const leadValues = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
    for (const row of leadRows) {
      leadCounts[row.status] = Number(row.count);
      leadValues[row.status] = Number(row.value);
    }

    const newLeads = Object.values(leadCounts).reduce((a, b) => a + b, 0);
    const signedLeads = leadCounts.signed;
    const activeLeads = newLeads - leadCounts.lost;
    const leadConversionRate =
      activeLeads > 0 ? Math.round((signedLeads / activeLeads) * 100) : 0;

    const { rows: pipelineRows } = await query<{ value: string }>(
      `SELECT COALESCE(SUM(estimated_value), 0)::text AS value
       FROM leads
       WHERE status NOT IN ('lost', 'signed')${leadStatic.clause}`,
      leadStatic.params,
    );
    const pipelineValue = Number(pipelineRows[0]?.value ?? 0);

    const { rows: forecastRows } = await query<{ value: string }>(
      `SELECT COALESCE(SUM(subtotal), 0)::text AS value
       FROM quotes
       WHERE status IN ('follow_up', 'negotiation')${quoteStatic.clause}`,
      quoteStatic.params,
    );
    const pipelineForecast = pipelineValue + Number(forecastRows[0]?.value ?? 0);

    const { rows: quoteRows } = await query<{ status: QuoteStatus; count: string; amount: string }>(
      `SELECT status, COUNT(*)::text AS count,
              COALESCE(SUM(subtotal), 0)::text AS amount
       FROM quotes
       WHERE 1=1${quoteQ.clause}
       GROUP BY status`,
      quoteQ.params,
    );

    let quotesSent = 0;
    let quotesAccepted = 0;
    const quotePipelineMap = new Map<string, { count: number; amount: number }>();

    for (const row of quoteRows) {
      const count = Number(row.count);
      const amount = Number(row.amount);
      quotePipelineMap.set(row.status, { count, amount });
      if (row.status === "accepted") quotesAccepted += count;
      if (["sent", "follow_up", "negotiation", "accepted", "rejected"].includes(row.status)) {
        quotesSent += count;
      }
    }

    const quoteConversionRate = quotesSent > 0 ? Math.round((quotesAccepted / quotesSent) * 100) : 0;

    const { rows: revenueQuoteRows } = await query<{ total: string }>(
      `SELECT COALESCE(SUM(subtotal), 0)::text AS total
       FROM quotes
       WHERE status = 'accepted'${revenueQuoteQ.clause}`,
      revenueQuoteQ.params,
    );
    const revenueQuotes = Number(revenueQuoteRows[0]?.total ?? 0);

    const { rows: revenueProjectRows } = await query<{ total: string }>(
      `SELECT COALESCE(SUM(budget), 0)::text AS total
       FROM projects
       WHERE status = 'delivered'${revenueProjectQ.clause}`,
      revenueProjectQ.params,
    );
    const revenueProjects = Number(revenueProjectRows[0]?.total ?? 0);

    const paidFilter = dateFilter("paid_at", from, to, 1);
    let invoiceParams: unknown[] = [...paidFilter.params];
    let invoiceClause = paidFilter.clause;
    ({ clause: invoiceClause, params: invoiceParams } = appendClientFilter(
      invoiceClause,
      invoiceParams,
      filters.clientId,
    ));
    const { rows: paidRows } = await query<{ paid: string; subtotal: string }>(
      `SELECT COALESCE(SUM(paid_amount), 0)::text AS paid,
              COALESCE(SUM(subtotal), 0)::text AS subtotal
       FROM invoices
       WHERE paid_amount > 0${invoiceClause}`,
      invoiceParams,
    );
    const paidRevenue = Number(paidRows[0]?.paid ?? 0);
    const invoicedSubtotal = Number(paidRows[0]?.subtotal ?? 0);
    const totalRevenue = revenueQuotes + revenueProjects;
    const marginEstimate = Math.round(totalRevenue > 0 ? totalRevenue * 0.35 : paidRevenue * 0.35);
    const profitabilityRate =
      invoicedSubtotal > 0
        ? Math.round((marginEstimate / invoicedSubtotal) * 100)
        : totalRevenue > 0
          ? 35
          : 0;

    const { rows: activeProjectRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM projects
       WHERE status NOT IN ('delivered', 'cancelled', 'on_hold')${projectStatic.clause}`,
      projectStatic.params,
    );
    const activeProjects = Number(activeProjectRows[0]?.count ?? 0);

    const { rows: deliveredProjectRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM projects
       WHERE status = 'delivered'${revenueProjectQ.clause}`,
      revenueProjectQ.params,
    );
    const deliveredProjects = Number(deliveredProjectRows[0]?.count ?? 0);

    const { rows: activeClientRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM clients WHERE status = 'active'`,
    );
    const activeClients = Number(activeClientRows[0]?.count ?? 0);

    const ticketClause = from
      ? ` AND resolved_at IS NOT NULL AND resolved_at >= $1 AND resolved_at <= $2`
      : ` AND resolved_at IS NOT NULL`;
    const { rows: ticketRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM support_tickets WHERE 1=1${ticketClause}`,
      from ? [from, to] : [],
    );
    const ticketsResolved = Number(ticketRows[0]?.count ?? 0);

    const { rows: sourceRows } = await query<{ source: LeadSource; count: string; value: string }>(
      `SELECT source, COUNT(*)::text AS count,
              COALESCE(SUM(estimated_value), 0)::text AS value
       FROM leads
       WHERE 1=1${leadQ.clause}
       GROUP BY source
       ORDER BY COUNT(*) DESC`,
      leadQ.params,
    );

    const { rows: trendRows } = await query<{
      month: string;
      leads: string;
      signed: string;
      quotes_sent: string;
      quotes_accepted: string;
      revenue: string;
    }>(
      `WITH months AS (
         SELECT date_trunc('month', d)::date AS month_start
         FROM generate_series(
           date_trunc('month', CURRENT_DATE) - INTERVAL '11 months',
           date_trunc('month', CURRENT_DATE),
           INTERVAL '1 month'
         ) AS d
       )
       SELECT
         to_char(m.month_start, 'YYYY-MM') AS month,
         COALESCE(l.cnt, 0)::text AS leads,
         COALESCE(ls.cnt, 0)::text AS signed,
         COALESCE(qs.cnt, 0)::text AS quotes_sent,
         COALESCE(qa.cnt, 0)::text AS quotes_accepted,
         COALESCE(qa.rev, 0)::text AS revenue
       FROM months m
       LEFT JOIN (
         SELECT date_trunc('month', created_at)::date AS m, COUNT(*) AS cnt
         FROM leads GROUP BY 1
       ) l ON l.m = m.month_start
       LEFT JOIN (
         SELECT date_trunc('month', created_at)::date AS m, COUNT(*) AS cnt
         FROM leads WHERE status = 'signed' GROUP BY 1
       ) ls ON ls.m = m.month_start
       LEFT JOIN (
         SELECT date_trunc('month', created_at)::date AS m, COUNT(*) AS cnt
         FROM quotes WHERE status IN ('sent','follow_up','negotiation','accepted','rejected') GROUP BY 1
       ) qs ON qs.m = m.month_start
       LEFT JOIN (
         SELECT date_trunc('month', updated_at)::date AS m,
                COUNT(*) AS cnt,
                SUM(subtotal) AS rev
         FROM quotes WHERE status = 'accepted' GROUP BY 1
       ) qa ON qa.m = m.month_start
       ORDER BY m.month_start`,
    );

    const { rows: teamRows } = await query<{
      assignee: string;
      open_tasks: string;
      overdue_tasks: string;
    }>(
      `SELECT COALESCE(NULLIF(TRIM(assignee), ''), 'Non assigné') AS assignee,
              COUNT(*) FILTER (WHERE status != 'done')::text AS open_tasks,
              COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'done')::text AS overdue_tasks
       FROM tasks
       GROUP BY 1
       ORDER BY COUNT(*) FILTER (WHERE status != 'done') DESC`,
    );

    const leadPipeline: PipelineRow[] = LEAD_STATUSES.map((status) => ({
      key: status,
      count: leadCounts[status],
      amount: leadValues[status],
    }));

    const quoteStatuses: QuoteStatus[] = [
      "draft",
      "sent",
      "follow_up",
      "negotiation",
      "accepted",
      "rejected",
      "expired",
    ];
    const quotePipeline: PipelineRow[] = quoteStatuses.map((status) => ({
      key: status,
      count: quotePipelineMap.get(status)?.count ?? 0,
      amount: quotePipelineMap.get(status)?.amount ?? 0,
    }));

    return {
      period: {
        from: from?.toISOString() ?? "",
        to: to.toISOString(),
        label,
      },
      kpis: {
        newLeads,
        signedLeads,
        leadConversionRate,
        quotesSent,
        quotesAccepted,
        quoteConversionRate,
        revenueQuotes,
        revenueProjects,
        pipelineValue,
        pipelineForecast,
        marginEstimate,
        profitabilityRate,
        activeProjects,
        deliveredProjects,
        activeClients,
        ticketsResolved,
      },
      leadPipeline,
      quotePipeline,
      leadsBySource: sourceRows.map((r) => ({
        source: r.source,
        count: Number(r.count),
        amount: Number(r.value),
      })),
      monthlyTrend: trendRows.map((r) => ({
        month: r.month,
        leads: Number(r.leads),
        signedLeads: Number(r.signed),
        quotesSent: Number(r.quotes_sent),
        quotesAccepted: Number(r.quotes_accepted),
        revenue: Number(r.revenue),
      })),
      teamWorkload: teamRows.map((r) => ({
        assignee: r.assignee,
        openTasks: Number(r.open_tasks),
        overdueTasks: Number(r.overdue_tasks),
      })),
    };
  });
}

export async function getMonthlyExportRows(months = 12): Promise<MonthlyTrendRow[]> {
  return withDb(async (query) => {
    const { rows } = await query<{
      month: string;
      leads: string;
      signed: string;
      quotes_sent: string;
      quotes_accepted: string;
      revenue: string;
    }>(
      `WITH months AS (
         SELECT date_trunc('month', d)::date AS month_start
         FROM generate_series(
           date_trunc('month', CURRENT_DATE) - (($1::int - 1) * INTERVAL '1 month'),
           date_trunc('month', CURRENT_DATE),
           INTERVAL '1 month'
         ) AS d
       )
       SELECT
         to_char(m.month_start, 'YYYY-MM') AS month,
         COALESCE(l.cnt, 0)::text AS leads,
         COALESCE(ls.cnt, 0)::text AS signed,
         COALESCE(qs.cnt, 0)::text AS quotes_sent,
         COALESCE(qa.cnt, 0)::text AS quotes_accepted,
         COALESCE(qa.rev, 0)::text AS revenue
       FROM months m
       LEFT JOIN (
         SELECT date_trunc('month', created_at)::date AS m, COUNT(*) AS cnt FROM leads GROUP BY 1
       ) l ON l.m = m.month_start
       LEFT JOIN (
         SELECT date_trunc('month', created_at)::date AS m, COUNT(*) AS cnt
         FROM leads WHERE status = 'signed' GROUP BY 1
       ) ls ON ls.m = m.month_start
       LEFT JOIN (
         SELECT date_trunc('month', created_at)::date AS m, COUNT(*) AS cnt
         FROM quotes WHERE status IN ('sent','follow_up','negotiation','accepted','rejected') GROUP BY 1
       ) qs ON qs.m = m.month_start
       LEFT JOIN (
         SELECT date_trunc('month', updated_at)::date AS m, COUNT(*) AS cnt, SUM(subtotal) AS rev
         FROM quotes WHERE status = 'accepted' GROUP BY 1
       ) qa ON qa.m = m.month_start
       ORDER BY m.month_start`,
      [months],
    );

    return rows.map((r) => ({
      month: r.month,
      leads: Number(r.leads),
      signedLeads: Number(r.signed),
      quotesSent: Number(r.quotes_sent),
      quotesAccepted: Number(r.quotes_accepted),
      revenue: Number(r.revenue),
    }));
  });
}

export function buildReportsCsv(rows: MonthlyTrendRow[]): string {
  const header = "Mois,Leads nouveaux,Leads signés,Devis envoyés,Devis acceptés,CA devis (FCFA)";
  const lines = rows.map(
    (r) =>
      `${r.month},${r.leads},${r.signedLeads},${r.quotesSent},${r.quotesAccepted},${r.revenue}`,
  );
  return [header, ...lines].join("\n");
}
