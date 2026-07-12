import type {
  CreateLeadInput,
  DuplicateLeadGroup,
  Lead,
  LeadListFilters,
  LeadListResult,
  LeadStatus,
} from "@/lib/leads";
import { parseFetchJson } from "@/lib/fetch-json";

async function parseJson<T>(res: Response): Promise<T> {
  return parseFetchJson<T>(res);
}

function buildLeadsQuery(filters: LeadListFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.source) params.set("source", filters.source);
  if (filters.assignee) params.set("assignee", filters.assignee);
  if (filters.q) params.set("q", filters.q);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.budgetMin !== undefined) params.set("budgetMin", String(filters.budgetMin));
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchLeads(): Promise<Lead[]> {
  const result = await fetchLeadsPaginated({ pageSize: 10_000 });
  return result.leads;
}

export async function fetchLeadsPaginated(filters: LeadListFilters = {}): Promise<LeadListResult> {
  const res = await fetch(`/api/admin/leads${buildLeadsQuery(filters)}`, { credentials: "include" });
  return parseJson<LeadListResult>(res);
}

export function getLeadsExportUrl(
  format: "csv" | "pdf",
  filters: Omit<LeadListFilters, "page" | "pageSize"> = {},
): string {
  const params = new URLSearchParams({ format });
  if (filters.status) params.set("status", filters.status);
  if (filters.source) params.set("source", filters.source);
  if (filters.assignee) params.set("assignee", filters.assignee);
  if (filters.q) params.set("q", filters.q);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.budgetMin !== undefined) params.set("budgetMin", String(filters.budgetMin));
  return `/api/admin/leads/export?${params.toString()}`;
}

export async function fetchLeadCounts(): Promise<Record<LeadStatus, number>> {
  const res = await fetch("/api/admin/leads?counts=1", { credentials: "include" });
  const json = await parseJson<{ counts: Record<LeadStatus, number> }>(res);
  return json.counts;
}

export async function createLeadApi(input: CreateLeadInput): Promise<Lead> {
  const res = await fetch("/api/admin/leads", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ lead: Lead }>(res);
  return json.lead;
}

export async function updateLeadApi(
  id: string,
  input: Partial<CreateLeadInput> & { status?: LeadStatus },
): Promise<Lead> {
  const res = await fetch(`/api/admin/leads/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ lead: Lead }>(res);
  return json.lead;
}

export async function fetchDuplicateLeadGroups(): Promise<DuplicateLeadGroup[]> {
  const res = await fetch("/api/admin/leads/duplicates", { credentials: "include" });
  const json = await parseJson<{ groups: DuplicateLeadGroup[] }>(res);
  return json.groups;
}

export async function mergeLeadsApi(sourceId: string, targetId: string): Promise<Lead> {
  const res = await fetch("/api/admin/leads/merge", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceId, targetId }),
  });
  const json = await parseJson<{ lead: Lead }>(res);
  return json.lead;
}

export async function deleteLeadApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/leads/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson<{ success: boolean }>(res);
}

export type LeadActivity = import("@/lib/lead-activities").LeadActivity;

export async function fetchLeadActivities(leadId: string): Promise<LeadActivity[]> {
  const res = await fetch(`/api/admin/leads/${leadId}/activities`, { credentials: "include" });
  const json = await parseJson<{ activities: LeadActivity[] }>(res);
  return json.activities;
}

export async function addLeadActivityApi(
  leadId: string,
  input: { content: string; subject?: string | null },
): Promise<LeadActivity> {
  const res = await fetch(`/api/admin/leads/${leadId}/activities`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ activity: LeadActivity }>(res);
  return json.activity;
}

export async function sendLeadEmailApi(
  leadId: string,
  input: { subject: string; body: string },
): Promise<void> {
  const res = await fetch(`/api/admin/leads/${leadId}/email`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await parseJson<{ success: boolean }>(res);
}
