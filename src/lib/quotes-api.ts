import type { Quote } from "@/lib/quotes";
import type { QuoteStatus } from "@/content/quotes-labels";
import type { QuoteListFilters } from "@/lib/quotes";
import { parseFetchJson } from "@/lib/fetch-json";

async function parseJson<T>(res: Response): Promise<T> {
  return parseFetchJson<T>(res);
}

function buildQuotesQuery(filters: QuoteListFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.q) params.set("q", filters.q);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.amountMin !== undefined) params.set("amountMin", String(filters.amountMin));
  if (filters.amountMax !== undefined) params.set("amountMax", String(filters.amountMax));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchQuotes(filters: QuoteListFilters = {}): Promise<Quote[]> {
  const res = await fetch(`/api/admin/quotes${buildQuotesQuery(filters)}`, { credentials: "include" });
  const json = await parseJson<{ quotes: Quote[] }>(res);
  return json.quotes;
}

export async function fetchQuoteStats(): Promise<{
  total: number;
  sent: number;
  accepted: number;
  conversionRate: number;
}> {
  const res = await fetch("/api/admin/quotes/stats", { credentials: "include" });
  return parseJson(res);
}

export async function updateQuoteApi(
  id: string,
  input: Record<string, unknown>,
): Promise<Quote> {
  const res = await fetch(`/api/admin/quotes/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ quote: Quote }>(res);
  return json.quote;
}

export async function deleteQuoteApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/quotes/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson<{ success: boolean }>(res);
}

export async function createQuoteApi(input: Record<string, unknown>): Promise<Quote> {
  const res = await fetch("/api/admin/quotes", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ quote: Quote }>(res);
  return json.quote;
}

export async function sendQuoteEmailApi(
  id: string,
  input: { subject: string; body: string },
): Promise<void> {
  const res = await fetch(`/api/admin/quotes/${id}/email`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await parseJson<{ success: boolean }>(res);
}

export function getQuotePdfUrl(id: string): string {
  return `/api/admin/quotes/${id}/pdf`;
}

export type { QuoteListFilters };
