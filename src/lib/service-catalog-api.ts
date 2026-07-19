import type { ServiceCatalogItem } from "@/lib/service-catalog";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchServiceCatalogItems(activeOnly = false): Promise<ServiceCatalogItem[]> {
  const params = activeOnly ? "?active=1" : "";
  const res = await fetch(`/api/admin/service-catalog${params}`, { credentials: "include" });
  const json = await parseFetchJson<{ items: ServiceCatalogItem[] }>(res);
  return json.items;
}

export async function createServiceCatalogItemApi(
  input: Record<string, unknown>,
): Promise<ServiceCatalogItem> {
  const res = await fetch("/api/admin/service-catalog", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ item: ServiceCatalogItem }>(res);
  return json.item;
}

export async function updateServiceCatalogItemApi(
  id: string,
  input: Record<string, unknown>,
): Promise<ServiceCatalogItem> {
  const res = await fetch(`/api/admin/service-catalog/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ item: ServiceCatalogItem }>(res);
  return json.item;
}

export async function deleteServiceCatalogItemApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/service-catalog/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson<{ success: boolean }>(res);
}

export async function reorderServiceCatalogItemApi(
  id: string,
  direction: "up" | "down",
): Promise<ServiceCatalogItem> {
  const res = await fetch(`/api/admin/service-catalog/${id}/reorder`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direction }),
  });
  const json = await parseFetchJson<{ item: ServiceCatalogItem }>(res);
  return json.item;
}

export async function importServiceCatalogFromConfigApi(): Promise<{
  imported: number;
  updated: number;
}> {
  const res = await fetch("/api/admin/service-catalog/import-config", {
    method: "POST",
    credentials: "include",
  });
  return parseFetchJson<{ imported: number; updated: number }>(res);
}
