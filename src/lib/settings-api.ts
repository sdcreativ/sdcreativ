import type { SettingsHealth } from "@/lib/settings-health";

type ApiError = { error: string };

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & ApiError;
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

export async function fetchSettingsHealth(): Promise<SettingsHealth> {
  const res = await fetch("/api/admin/settings/health", { credentials: "include" });
  const json = await parseJson<{ health: SettingsHealth }>(res);
  return json.health;
}

export async function fetchPortalAccounts(): Promise<Array<{ id: string; label: string; company: string }>> {
  const res = await fetch("/api/admin/portal-accounts", { credentials: "include" });
  const json = await parseJson<{ clients: Array<{ id: string; label: string; company: string }> }>(res);
  return json.clients;
}
