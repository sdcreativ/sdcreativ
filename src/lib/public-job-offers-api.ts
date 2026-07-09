import type { PublicJobOfferRecord } from "@/lib/public-job-offers-types";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchJobOffersAdmin(): Promise<PublicJobOfferRecord[]> {
  const res = await fetch("/api/admin/public-job-offers", { credentials: "include" });
  const json = await parseFetchJson<{ items: PublicJobOfferRecord[] }>(res);
  return json.items;
}

export async function createJobOfferApi(
  input: Record<string, unknown>,
): Promise<PublicJobOfferRecord> {
  const res = await fetch("/api/admin/public-job-offers", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ item: PublicJobOfferRecord }>(res);
  return json.item;
}

export async function updateJobOfferApi(
  id: string,
  input: Record<string, unknown>,
): Promise<PublicJobOfferRecord> {
  const res = await fetch(`/api/admin/public-job-offers/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ item: PublicJobOfferRecord }>(res);
  return json.item;
}

export async function deleteJobOfferApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/public-job-offers/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson<{ success: boolean }>(res);
}

export async function reorderJobOfferApi(
  id: string,
  direction: "up" | "down",
): Promise<PublicJobOfferRecord> {
  const res = await fetch(`/api/admin/public-job-offers/${id}/reorder`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direction }),
  });
  const json = await parseFetchJson<{ item: PublicJobOfferRecord }>(res);
  return json.item;
}

export async function importStaticJobOffersApi(): Promise<{ imported: number; skipped: number }> {
  const res = await fetch("/api/admin/public-job-offers/import-static", {
    method: "POST",
    credentials: "include",
  });
  return parseFetchJson<{ imported: number; skipped: number }>(res);
}

export async function fetchCareersSettingsAdmin(): Promise<{ benefits: string[] }> {
  const res = await fetch("/api/admin/site-careers", { credentials: "include" });
  const json = await parseFetchJson<{ careers: { benefits: string[] } }>(res);
  return json.careers;
}

export async function saveCareersSettingsAdmin(input: {
  benefits: string[];
}): Promise<{ benefits: string[] }> {
  const res = await fetch("/api/admin/site-careers", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ careers: { benefits: string[] } }>(res);
  return json.careers;
}
