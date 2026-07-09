import type { PublicServiceRecord, StoredServiceDetail } from "@/lib/public-services-types";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchServicesAdmin(): Promise<PublicServiceRecord[]> {
  const res = await fetch("/api/admin/public-services", { credentials: "include" });
  const json = await parseFetchJson<{ items: PublicServiceRecord[] }>(res);
  return json.items;
}

export async function createServiceApi(
  input: Record<string, unknown>,
): Promise<PublicServiceRecord> {
  const res = await fetch("/api/admin/public-services", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ item: PublicServiceRecord }>(res);
  return json.item;
}

export async function updateServiceApi(
  id: string,
  input: Record<string, unknown>,
): Promise<PublicServiceRecord> {
  const res = await fetch(`/api/admin/public-services/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ item: PublicServiceRecord }>(res);
  return json.item;
}

export async function deleteServiceApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/public-services/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson<{ success: boolean }>(res);
}

export async function reorderServiceApi(
  id: string,
  direction: "up" | "down",
): Promise<PublicServiceRecord> {
  const res = await fetch(`/api/admin/public-services/${id}/reorder`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direction }),
  });
  const json = await parseFetchJson<{ item: PublicServiceRecord }>(res);
  return json.item;
}

export async function importStaticServicesApi(): Promise<{ imported: number; skipped: number }> {
  const res = await fetch("/api/admin/public-services/import-static", {
    method: "POST",
    credentials: "include",
  });
  return parseFetchJson<{ imported: number; skipped: number }>(res);
}

export type { StoredServiceDetail };
