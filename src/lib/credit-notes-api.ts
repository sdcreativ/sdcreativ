import type { CreditNote } from "@/lib/credit-notes";

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

export async function fetchCreditNotes(filters?: {
  clientId?: string;
  invoiceId?: string;
}): Promise<CreditNote[]> {
  const params = new URLSearchParams();
  if (filters?.clientId) params.set("clientId", filters.clientId);
  if (filters?.invoiceId) params.set("invoiceId", filters.invoiceId);
  const qs = params.toString();
  const res = await fetch(`/api/admin/credit-notes${qs ? `?${qs}` : ""}`, { credentials: "include" });
  const json = await parseJson<{ creditNotes: CreditNote[] }>(res);
  return json.creditNotes;
}

export async function createCreditNoteApi(input: {
  invoiceId: string;
  amount: number;
  reason?: string;
}): Promise<CreditNote> {
  const res = await fetch("/api/admin/credit-notes", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ creditNote: CreditNote }>(res);
  return json.creditNote;
}

export async function updateCreditNoteApi(
  id: string,
  input: Record<string, unknown>,
): Promise<CreditNote> {
  const res = await fetch(`/api/admin/credit-notes/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ creditNote: CreditNote }>(res);
  return json.creditNote;
}

export async function deleteCreditNoteApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/credit-notes/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson(res);
}
