import type { ApiKeyScope } from "@/content/priority3-labels";
import { parseFetchJson } from "@/lib/fetch-json";

export type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export async function fetchApiKeys(): Promise<ApiKeyRow[]> {
  const res = await fetch("/api/admin/api-keys", { credentials: "include" });
  const json = await parseFetchJson<{ apiKeys: ApiKeyRow[] }>(res);
  return json.apiKeys ?? [];
}

export async function createApiKeyApi(input: {
  name: string;
  scopes: ApiKeyScope[];
}): Promise<ApiKeyRow & { plainKey: string }> {
  const res = await fetch("/api/admin/api-keys", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ apiKey: ApiKeyRow & { plainKey: string } }>(res);
  return json.apiKey;
}

export async function revokeApiKeyApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/api-keys?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson(res);
}
