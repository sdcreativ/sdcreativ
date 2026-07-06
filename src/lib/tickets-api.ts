import type { Ticket, TicketMessage, TicketListFilters } from "@/lib/tickets";
import type { TicketStatus } from "@/content/tickets-labels";

type ApiError = { error: string };

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & ApiError;
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

function buildTicketsQuery(filters: TicketListFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.assignee) params.set("assignee", filters.assignee);
  if (filters.slaBreached === true) params.set("sla", "breached");
  if (filters.slaBreached === false) params.set("sla", "ok");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchTickets(filters: TicketListFilters = {}): Promise<Ticket[]> {
  const res = await fetch(`/api/admin/tickets${buildTicketsQuery(filters)}`, {
    credentials: "include",
  });
  const json = await parseJson<{ tickets: Ticket[] }>(res);
  return json.tickets;
}

export async function fetchTicketStats(): Promise<{
  total: number;
  open: number;
  inProgress: number;
  slaBreached: number;
  resolved: number;
}> {
  const res = await fetch("/api/admin/tickets/stats", { credentials: "include" });
  return parseJson(res);
}

export async function createTicketApi(input: Record<string, unknown>): Promise<Ticket> {
  const res = await fetch("/api/admin/tickets", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ ticket: Ticket }>(res);
  return json.ticket;
}

export async function updateTicketApi(
  id: string,
  input: Record<string, unknown>,
): Promise<Ticket> {
  const res = await fetch(`/api/admin/tickets/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ ticket: Ticket }>(res);
  return json.ticket;
}

export async function deleteTicketApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/tickets/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson<{ success: boolean }>(res);
}

export async function fetchTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const res = await fetch(`/api/admin/tickets/${ticketId}/messages`, {
    credentials: "include",
  });
  const json = await parseJson<{ messages: TicketMessage[] }>(res);
  return json.messages;
}

export async function addTicketMessageApi(
  ticketId: string,
  input: { content: string; authorType: "staff"; authorName?: string; notifyClient?: boolean },
): Promise<{ message: TicketMessage; ticket: Ticket }> {
  const res = await fetch(`/api/admin/tickets/${ticketId}/messages`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export type { TicketStatus, TicketListFilters };
