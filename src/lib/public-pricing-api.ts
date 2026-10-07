import type {
  PricingSettings,
  PublicPricingPlanRecord,
  PublicPricingReassuranceRecord,
} from "@/lib/public-pricing";
import { parseFetchJson } from "@/lib/fetch-json";
import type { HostingCatalogEntry } from "@/lib/pricing-display";

export async function fetchPricingPlansAdmin(locale?: string): Promise<PublicPricingPlanRecord[]> {
  const search = new URLSearchParams();
  if (locale) search.set("locale", locale);
  const qs = search.toString();

  const res = await fetch(`/api/admin/pricing-plans${qs ? `?${qs}` : ""}`, {
    credentials: "include",
  });
  const json = await parseFetchJson<{ plans: PublicPricingPlanRecord[] }>(res);
  return json.plans;
}

export async function createPricingPlanApi(
  input: Record<string, unknown>,
): Promise<PublicPricingPlanRecord> {
  const res = await fetch("/api/admin/pricing-plans", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ plan: PublicPricingPlanRecord }>(res);
  return json.plan;
}

export async function updatePricingPlanApi(
  id: string,
  input: Record<string, unknown>,
): Promise<PublicPricingPlanRecord> {
  const res = await fetch(`/api/admin/pricing-plans/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ plan: PublicPricingPlanRecord }>(res);
  return json.plan;
}

export async function deletePricingPlanApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/pricing-plans/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson<{ success: boolean }>(res);
}

export async function reorderPricingPlanApi(
  id: string,
  direction: "up" | "down",
): Promise<PublicPricingPlanRecord> {
  const res = await fetch(`/api/admin/pricing-plans/${id}/reorder`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direction }),
  });
  const json = await parseFetchJson<{ plan: PublicPricingPlanRecord }>(res);
  return json.plan;
}

export async function fetchPricingReassuranceAdmin(
  locale?: string,
): Promise<PublicPricingReassuranceRecord[]> {
  const search = new URLSearchParams();
  if (locale) search.set("locale", locale);
  const qs = search.toString();

  const res = await fetch(`/api/admin/pricing-reassurance${qs ? `?${qs}` : ""}`, {
    credentials: "include",
  });
  const json = await parseFetchJson<{ items: PublicPricingReassuranceRecord[] }>(res);
  return json.items;
}

export async function createPricingReassuranceApi(
  input: Record<string, unknown>,
): Promise<PublicPricingReassuranceRecord> {
  const res = await fetch("/api/admin/pricing-reassurance", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ item: PublicPricingReassuranceRecord }>(res);
  return json.item;
}

export async function updatePricingReassuranceApi(
  id: string,
  input: Record<string, unknown>,
): Promise<PublicPricingReassuranceRecord> {
  const res = await fetch(`/api/admin/pricing-reassurance/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ item: PublicPricingReassuranceRecord }>(res);
  return json.item;
}

export async function deletePricingReassuranceApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/pricing-reassurance/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson<{ success: boolean }>(res);
}

export async function importStaticPricingApi(): Promise<{
  plansImported: number;
  plansSkipped: number;
  reassuranceImported: number;
  reassuranceSkipped: number;
}> {
  const res = await fetch("/api/admin/pricing-plans/import-static", {
    method: "POST",
    credentials: "include",
  });
  return parseFetchJson<{
    plansImported: number;
    plansSkipped: number;
    reassuranceImported: number;
    reassuranceSkipped: number;
  }>(res);
}

export async function fetchPricingSettingsApi(): Promise<PricingSettings> {
  const res = await fetch("/api/admin/pricing-settings", { credentials: "include" });
  return parseFetchJson<PricingSettings>(res);
}

export async function updatePricingSettingsApi(
  input: PricingSettings,
): Promise<PricingSettings & { plansUpdated: number }> {
  const res = await fetch("/api/admin/pricing-settings", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseFetchJson<PricingSettings & { plansUpdated: number }>(res);
}

export type HostingCatalogResponse = {
  entries: HostingCatalogEntry[];
  syncedAt: string | null;
  apiConfigured: boolean;
};

export async function fetchHostingCatalogApi(): Promise<HostingCatalogResponse> {
  const res = await fetch("/api/admin/pricing-hosting-catalog", { credentials: "include" });
  return parseFetchJson<HostingCatalogResponse>(res);
}

export async function syncHostingCatalogApi(): Promise<{ packs: number; prices: number; changes: unknown[] }> {
  const res = await fetch("/api/admin/pricing-hosting-catalog/sync", { method: "POST", credentials: "include" });
  return parseFetchJson<{ packs: number; prices: number; changes: unknown[] }>(res);
}

export async function applyHostingCatalogApi(): Promise<{ pricesApplied: number; plansUpdated: number }> {
  const res = await fetch("/api/admin/pricing-hosting-catalog/apply", { method: "POST", credentials: "include" });
  return parseFetchJson<{ pricesApplied: number; plansUpdated: number }>(res);
}
