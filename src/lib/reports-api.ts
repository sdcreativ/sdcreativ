import type { ReportPeriod } from "@/content/reports-labels";
import type { DrilldownEntity, DrilldownItem } from "@/lib/reports-drilldown";
import type { ReportsComparison, ReportsFilters, ReportsSummary } from "@/lib/reports";
import type { CommunicationsStats } from "@/lib/communications-stats";
import { parseFetchJson } from "@/lib/fetch-json";

async function parseJson<T>(res: Response): Promise<T> {
  return parseFetchJson<T>(res);
}

export type { ReportsFilters };

export type ReportsResponse = {
  summary: ReportsSummary;
  comparison: ReportsComparison | null;
};

export async function fetchReportsSummary(
  period: ReportPeriod,
  filters: ReportsFilters = {},
  options: { compare?: boolean } = {},
): Promise<ReportsResponse> {
  const params = new URLSearchParams({ period });
  if (filters.assignee) params.set("assignee", filters.assignee);
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (options.compare) params.set("compare", "1");
  const res = await fetch(`/api/admin/reports?${params}`, { credentials: "include" });
  return parseJson<ReportsResponse>(res);
}

export async function fetchReportDrilldown(input: {
  entity: DrilldownEntity;
  key: string;
  period: ReportPeriod;
  source?: string;
}): Promise<{ items: DrilldownItem[]; listHref: string }> {
  const params = new URLSearchParams({ period: input.period });
  if (input.source) {
    params.set("source", input.source);
  } else {
    params.set("entity", input.entity);
    params.set("key", input.key);
  }
  const res = await fetch(`/api/admin/reports/drilldown?${params}`, { credentials: "include" });
  return parseJson<{ items: DrilldownItem[]; listHref: string }>(res);
}

export function getReportsExportUrl(months = 12): string {
  return `/api/admin/reports/export?months=${months}`;
}

export type { CommunicationsStats };

export async function fetchCommunicationsStats(
  period: ReportPeriod = "month",
  channel: "all" | "chat" | "call" | "meeting" = "all",
): Promise<CommunicationsStats> {
  const params = new URLSearchParams({ period, channel });
  const res = await fetch(`/api/admin/reports/communications?${params}`, {
    credentials: "include",
  });
  const data = await parseJson<{ stats: CommunicationsStats }>(res);
  return data.stats;
}

export function getCommunicationsStatsExportUrl(
  period: ReportPeriod = "month",
  channel: "all" | "chat" | "call" | "meeting" = "all",
): string {
  const params = new URLSearchParams({ period, channel });
  return `/api/admin/reports/communications/export?${params}`;
}

export function getReportsPdfUrl(period: ReportPeriod = "month", compare = false): string {
  const params = new URLSearchParams({ period });
  if (compare) params.set("compare", "1");
  return `/api/admin/reports/pdf?${params}`;
}
