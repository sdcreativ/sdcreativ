import type { ClientPortalNotificationPrefs, ClientPortalSettingsPayload } from "@/lib/client-portal-settings";

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Erreur serveur.");
  return json;
}

export async function fetchPortalSettings(): Promise<ClientPortalSettingsPayload> {
  const res = await fetch("/api/espace-client/settings", { credentials: "include" });
  const json = await parseJson<{ settings: ClientPortalSettingsPayload }>(res);
  return json.settings;
}

export async function updatePortalSettings(input: {
  name?: string;
  phone?: string | null;
  company?: string | null;
  notifications?: Partial<ClientPortalNotificationPrefs>;
}): Promise<ClientPortalSettingsPayload> {
  const res = await fetch("/api/espace-client/settings", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ settings: ClientPortalSettingsPayload }>(res);
  return json.settings;
}

export async function rotatePortalAccessCode(currentToken: string): Promise<{ accessCode: string }> {
  const res = await fetch("/api/espace-client/settings/access-code", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentToken }),
  });
  return parseJson<{ accessCode: string }>(res);
}

export type { ClientPortalSettingsPayload, ClientPortalNotificationPrefs };
