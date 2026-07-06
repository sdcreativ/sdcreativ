import type { Invoice } from "@/lib/invoices";
import type { InvoiceStatus } from "@/content/invoices-labels";

type ApiError = { error: string };

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & ApiError;
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const res = await fetch("/api/admin/invoices", { credentials: "include" });
  const json = await parseJson<{ invoices: Invoice[] }>(res);
  return json.invoices;
}

export async function fetchInvoiceStats(): Promise<{
  total: number;
  sent: number;
  paid: number;
  overdue: number;
  totalOutstanding: number;
}> {
  const res = await fetch("/api/admin/invoices/stats", { credentials: "include" });
  return parseJson(res);
}

export async function createInvoiceApi(input: Record<string, unknown>): Promise<Invoice> {
  const res = await fetch("/api/admin/invoices", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ invoice: Invoice }>(res);
  return json.invoice;
}

export async function updateInvoiceApi(
  id: string,
  input: Record<string, unknown>,
): Promise<Invoice> {
  const res = await fetch(`/api/admin/invoices/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ invoice: Invoice }>(res);
  return json.invoice;
}

export async function deleteInvoiceApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/invoices/${id}`, {
    method: "DELETE",
    credentials: "include" });
  await parseJson<{ success: boolean }>(res);
}

export async function createInvoiceFromQuoteApi(quoteId: string): Promise<Invoice> {
  const res = await fetch("/api/admin/invoices", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromQuoteId: quoteId }),
  });
  const json = await parseJson<{ invoice: Invoice }>(res);
  return json.invoice;
}

export function getInvoicePdfUrl(id: string): string {
  return `/api/admin/invoices/${id}/pdf`;
}

export async function sendInvoiceEmailApi(
  id: string,
  input: { subject: string; body: string },
): Promise<void> {
  const res = await fetch(`/api/admin/invoices/${id}/email`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await parseJson<{ success: boolean }>(res);
}

export type { InvoiceStatus };
