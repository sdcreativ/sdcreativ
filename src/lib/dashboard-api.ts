import type { DashboardSnapshot } from "@/lib/dashboard";
import type { DashboardPeriod } from "@/content/reports-labels";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchDashboardSnapshot(
  period: DashboardPeriod,
  filters?: { assignee?: string; clientId?: string },
): Promise<DashboardSnapshot> {
  const params = new URLSearchParams({ period });
  if (filters?.assignee) params.set("assignee", filters.assignee);
  if (filters?.clientId) params.set("clientId", filters.clientId);
  const res = await fetch(`/api/admin/dashboard?${params}`, { credentials: "include" });
  return parseFetchJson<DashboardSnapshot>(res);
}
