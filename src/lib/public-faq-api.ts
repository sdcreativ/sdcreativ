import type { PublicFaqItemRecord } from "@/lib/public-faq-items";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchFaqItemsAdmin(locale?: string): Promise<PublicFaqItemRecord[]> {
  const search = new URLSearchParams();
  if (locale) search.set("locale", locale);
  const qs = search.toString();

  const res = await fetch(`/api/admin/faq-items${qs ? `?${qs}` : ""}`, {
    credentials: "include",
  });
  const json = await parseFetchJson<{ items: PublicFaqItemRecord[] }>(res);
  return json.items;
}

export async function createFaqItemApi(
  input: Record<string, unknown>,
): Promise<PublicFaqItemRecord> {
  const res = await fetch("/api/admin/faq-items", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ item: PublicFaqItemRecord }>(res);
  return json.item;
}

export async function updateFaqItemApi(
  id: string,
  input: Record<string, unknown>,
): Promise<PublicFaqItemRecord> {
  const res = await fetch(`/api/admin/faq-items/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ item: PublicFaqItemRecord }>(res);
  return json.item;
}

export async function deleteFaqItemApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/faq-items/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson<{ success: boolean }>(res);
}

export async function reorderFaqItemApi(
  id: string,
  direction: "up" | "down",
): Promise<PublicFaqItemRecord> {
  const res = await fetch(`/api/admin/faq-items/${id}/reorder`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direction }),
  });
  const json = await parseFetchJson<{ item: PublicFaqItemRecord }>(res);
  return json.item;
}

export async function importStaticFaqItemsApi(): Promise<{ imported: number; skipped: number }> {
  const res = await fetch("/api/admin/faq-items/import-static", {
    method: "POST",
    credentials: "include",
  });
  return parseFetchJson<{ imported: number; skipped: number }>(res);
}
