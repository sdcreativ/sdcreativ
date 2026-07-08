import type { PublicPartnerRecord } from "@/lib/public-partners";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchPartnersAdmin(locale?: string): Promise<PublicPartnerRecord[]> {
  const search = new URLSearchParams();
  if (locale) search.set("locale", locale);
  const qs = search.toString();

  const res = await fetch(`/api/admin/partners${qs ? `?${qs}` : ""}`, {
    credentials: "include",
  });
  const json = await parseFetchJson<{ partners: PublicPartnerRecord[] }>(res);
  return json.partners;
}

export async function createPartnerApi(
  input: Record<string, unknown>,
): Promise<PublicPartnerRecord> {
  const res = await fetch("/api/admin/partners", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ partner: PublicPartnerRecord }>(res);
  return json.partner;
}

export async function updatePartnerApi(
  id: string,
  input: Record<string, unknown>,
): Promise<PublicPartnerRecord> {
  const res = await fetch(`/api/admin/partners/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ partner: PublicPartnerRecord }>(res);
  return json.partner;
}

export async function deletePartnerApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/partners/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson<{ success: boolean }>(res);
}

export async function reorderPartnerApi(
  id: string,
  direction: "up" | "down",
): Promise<PublicPartnerRecord> {
  const res = await fetch(`/api/admin/partners/${id}/reorder`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direction }),
  });
  const json = await parseFetchJson<{ partner: PublicPartnerRecord }>(res);
  return json.partner;
}

export async function importStaticPartnersApi(): Promise<{ imported: number; skipped: number }> {
  const res = await fetch("/api/admin/partners/import-static", {
    method: "POST",
    credentials: "include",
  });
  return parseFetchJson<{ imported: number; skipped: number }>(res);
}
