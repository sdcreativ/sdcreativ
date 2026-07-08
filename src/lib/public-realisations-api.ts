import type { PublicRealisationRecord } from "@/lib/public-realisations";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchRealisationsAdmin(locale?: string): Promise<PublicRealisationRecord[]> {
  const search = new URLSearchParams();
  if (locale) search.set("locale", locale);
  const qs = search.toString();

  const res = await fetch(`/api/admin/realisations${qs ? `?${qs}` : ""}`, {
    credentials: "include",
  });
  const json = await parseFetchJson<{ realisations: PublicRealisationRecord[] }>(res);
  return json.realisations;
}

export async function createRealisationApi(
  input: Record<string, unknown>,
): Promise<PublicRealisationRecord> {
  const res = await fetch("/api/admin/realisations", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ realisation: PublicRealisationRecord }>(res);
  return json.realisation;
}

export async function updateRealisationApi(
  id: string,
  input: Record<string, unknown>,
): Promise<PublicRealisationRecord> {
  const res = await fetch(`/api/admin/realisations/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ realisation: PublicRealisationRecord }>(res);
  return json.realisation;
}

export async function deleteRealisationApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/realisations/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson<{ success: boolean }>(res);
}

export async function reorderRealisationApi(
  id: string,
  direction: "up" | "down",
): Promise<PublicRealisationRecord> {
  const res = await fetch(`/api/admin/realisations/${id}/reorder`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direction }),
  });
  const json = await parseFetchJson<{ realisation: PublicRealisationRecord }>(res);
  return json.realisation;
}

export async function importStaticRealisationsApi(): Promise<{ imported: number; skipped: number }> {
  const res = await fetch("/api/admin/realisations/import-static", {
    method: "POST",
    credentials: "include",
  });
  return parseFetchJson<{ imported: number; skipped: number }>(res);
}
