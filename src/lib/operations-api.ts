import type { TimeEntry, ProjectTimeSummary } from "@/lib/time-entries";
import type { InboxItem } from "@/lib/inbox";
import type { OperationsSettings } from "@/lib/operations-settings-types";

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

export async function fetchTimeEntries(filters?: {
  projectId?: string;
  from?: string;
  to?: string;
}): Promise<TimeEntry[]> {
  const params = new URLSearchParams();
  if (filters?.projectId) params.set("projectId", filters.projectId);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  const qs = params.toString();
  const res = await fetch(`/api/admin/time-entries${qs ? `?${qs}` : ""}`, { credentials: "include" });
  const json = await parseJson<{ entries: TimeEntry[] }>(res);
  return json.entries;
}

export async function fetchTimeSummaries(): Promise<ProjectTimeSummary[]> {
  const res = await fetch("/api/admin/time-entries?view=summary", { credentials: "include" });
  const json = await parseJson<{ summaries: ProjectTimeSummary[] }>(res);
  return json.summaries;
}

export async function createTimeEntryApi(input: Record<string, unknown>): Promise<TimeEntry> {
  const res = await fetch("/api/admin/time-entries", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ entry: TimeEntry }>(res);
  return json.entry;
}

export async function deleteTimeEntryApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/time-entries/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson(res);
}

export async function fetchInboxItems(filters?: {
  type?: string;
  unreadOnly?: boolean;
}): Promise<{ items: InboxItem[]; unreadCount: number }> {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.unreadOnly) params.set("unreadOnly", "1");
  const qs = params.toString();
  const res = await fetch(`/api/admin/inbox${qs ? `?${qs}` : ""}`, { credentials: "include" });
  return parseJson(res);
}

export async function markInboxReadApi(itemKey: string): Promise<void> {
  const res = await fetch("/api/admin/inbox", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemKey }),
  });
  await parseJson(res);
}

export async function markAllInboxReadApi(keys: string[]): Promise<void> {
  const res = await fetch("/api/admin/inbox", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "mark_all_read", keys }),
  });
  await parseJson(res);
}

export function getAccountingExportUrl(filters?: {
  from?: string;
  to?: string;
  clientId?: string;
}): string {
  const params = new URLSearchParams({ format: "csv" });
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.clientId) params.set("clientId", filters.clientId);
  return `/api/admin/accounting/export?${params}`;
}

export async function fetchOperationsSettings(): Promise<OperationsSettings> {
  const res = await fetch("/api/admin/operations-settings", { credentials: "include" });
  const json = await parseJson<{ operations: OperationsSettings }>(res);
  return json.operations;
}

export async function saveOperationsSettings(
  operations: OperationsSettings,
): Promise<OperationsSettings> {
  const res = await fetch("/api/admin/operations-settings", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(operations),
  });
  const json = await parseJson<{ operations: OperationsSettings }>(res);
  return json.operations;
}
