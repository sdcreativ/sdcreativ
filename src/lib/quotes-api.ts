import type { Quote } from "@/lib/quotes";
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

export async function validateQuoteApi(id: string): Promise<{
  quote: Quote;
  invoiceGenerated: boolean;
  invoice?: { id: string; reference: string };
  emailSent?: boolean;
}> {
  const res = await fetch(`/api/admin/quotes/${id}/validate`, {
    method: "POST",
    credentials: "include",
  });
  return parseJson(res);
}

export async function generateInvoiceFromQuoteApi(
  id: string,
  input: { sendEmail?: boolean } = {},
): Promise<{
  invoice: { id: string; reference: string };
  quote: Quote;
  documentId: string;
  emailSent: boolean;
  alreadyExists: boolean;
}> {
  const res = await fetch(`/api/admin/quotes/${id}/generate-invoice`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function publishQuoteApi(
  id: string,
  input: { sendEmail?: boolean } = {},
): Promise<{
  quote: Quote;
  documentId: string;
  emailSent: boolean;
  portalClientId: string;
}> {
  const res = await fetch(`/api/admin/quotes/${id}/publish`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function fetchQuoteDocuments(id: string) {
  const res = await fetch(`/api/admin/quotes/${id}/documents`, { credentials: "include" });
  return parseJson<{
    documents: Array<{
      id: string;
      kind: string;
      fileName: string;
      mimeType: string;
      createdAt: string;
      downloadUrl: string | null;
    }>;
  }>(res);
}

export async function fetchQuoteTimeline(id: string) {
  const res = await fetch(`/api/admin/quotes/${id}/timeline`, { credentials: "include" });
  return parseJson<{
    events: Array<{
      id: string;
      action: string;
      summary: string;
      fromStatus: string | null;
      toStatus: string | null;
      actorName: string | null;
      createdAt: string;
    }>;
  }>(res);
}

export function getQuotePdfUrl(id: string): string {
  return `/api/admin/quotes/${id}/pdf`;
}

export type { QuoteListFilters };
