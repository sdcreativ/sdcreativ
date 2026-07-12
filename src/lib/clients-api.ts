import type { Client, ClientListFilters, DuplicateClientGroup } from "@/lib/clients";
import type { InteractionType } from "@/content/clients-labels";

type ApiError = { error: string };

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & ApiError;
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

function buildClientsQuery(filters: ClientListFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.accountManager) params.set("accountManager", filters.accountManager);
  if (filters.sector) params.set("sector", filters.sector);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.q) params.set("q", filters.q);
  if (filters.revenueMin !== undefined) params.set("revenueMin", String(filters.revenueMin));
  if (filters.revenueMax !== undefined) params.set("revenueMax", String(filters.revenueMax));
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchCrmClients(filters: ClientListFilters = {}): Promise<Client[]> {
  const result = await fetchClientsPaginated({ ...filters, pageSize: filters.pageSize ?? 10_000 });
  return result.clients;
}

export async function fetchClientsPaginated(
  filters: ClientListFilters = {},
): Promise<import("@/lib/clients").ClientListResult> {
  const res = await fetch(`/api/admin/clients${buildClientsQuery(filters)}`, { credentials: "include" });
  return parseJson(res);
}

export function getClientsExportUrl(filters: ClientListFilters = {}): string {
  return `/api/admin/clients/export${buildClientsQuery(filters)}`;
}

export async function fetchDuplicateClientGroups(): Promise<DuplicateClientGroup[]> {
  const res = await fetch("/api/admin/clients/duplicates", { credentials: "include" });
  const json = await parseJson<{ groups: DuplicateClientGroup[] }>(res);
  return json.groups;
}

export async function mergeClientsApi(sourceId: string, targetId: string): Promise<Client> {
  const res = await fetch("/api/admin/clients/merge", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceId, targetId }),
  });
  const json = await parseJson<{ client: Client }>(res);
  return json.client;
}

export async function fetchCrmClientById(id: string): Promise<Client> {
  const res = await fetch(`/api/admin/clients/${id}`, { credentials: "include" });
  const json = await parseJson<{ client: Client }>(res);
  return json.client;
}

export async function createCrmClient(input: Record<string, unknown>): Promise<Client> {
  const res = await fetch("/api/admin/clients", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ client: Client }>(res);
  return json.client;
}

export async function updateCrmClient(
  id: string,
  input: Record<string, unknown>,
): Promise<Client> {
  const res = await fetch(`/api/admin/clients/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ client: Client }>(res);
  return json.client;
}

export async function deleteCrmClient(id: string): Promise<void> {
  const res = await fetch(`/api/admin/clients/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson<{ success: boolean }>(res);
}

export async function fetchClientInteractions(
  clientId: string,
): Promise<import("@/lib/clients").ClientInteraction[]> {
  const res = await fetch(`/api/admin/clients/${clientId}/interactions`, {
    credentials: "include",
  });
  const json = await parseJson<{ interactions: import("@/lib/clients").ClientInteraction[] }>(res);
  return json.interactions;
}

export async function addClientInteractionApi(
  clientId: string,
  input: { type: InteractionType; subject?: string; content: string },
): Promise<import("@/lib/clients").ClientInteraction> {
  const res = await fetch(`/api/admin/clients/${clientId}/interactions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ interaction: import("@/lib/clients").ClientInteraction }>(res);
  return json.interaction;
}

export async function convertLeadToClient(leadId: string): Promise<Client> {
  const res = await fetch("/api/admin/clients", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leadId }),
  });
  const json = await parseJson<{ client: Client }>(res);
  return json.client;
}

export async function fetchClientOverview(clientId: string): Promise<import("@/lib/clients").ClientOverview> {
  const res = await fetch(`/api/admin/clients/${clientId}/overview`, {
    credentials: "include",
  });
  const json = await parseJson<{ overview: import("@/lib/clients").ClientOverview }>(res);
  return json.overview;
}

export type { ClientListFilters };
