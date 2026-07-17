import type { DealRecord, DealStage } from "@/lib/deals";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchDeals(filters?: {
  q?: string;
  scope?: "mine" | "all";
}): Promise<DealRecord[]> {
  const params = new URLSearchParams();
  if (filters?.q) params.set("q", filters.q);
  if (filters?.scope === "mine") params.set("scope", "mine");
  const qs = params.toString();
  const res = await fetch(`/api/admin/deals${qs ? `?${qs}` : ""}`, { credentials: "include" });
  const json = await parseFetchJson<{ deals: DealRecord[] }>(res);
  return json.deals;
}

export async function updateDealStageApi(leadId: string, stage: DealStage): Promise<DealRecord> {
  const res = await fetch(`/api/admin/deals/${leadId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
  });
  const json = await parseFetchJson<{ deal: DealRecord }>(res);
  return json.deal;
}
