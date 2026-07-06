import type { CrmSearchResult } from "@/lib/crm-search-types";

type ApiError = { error: string };

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & ApiError;
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

export async function searchCrmApi(query: string, limit = 12): Promise<CrmSearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const res = await fetch(`/api/admin/search?${params}`, { credentials: "include" });
  const json = await parseJson<{ results: CrmSearchResult[] }>(res);
  return json.results;
}
