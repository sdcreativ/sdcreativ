import type { CrmNotification } from "@/lib/billing/notifications";

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Erreur serveur.");
  return json;
}

export async function fetchAdminBillingNotifications(since?: string): Promise<CrmNotification[]> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : "";
  const res = await fetch(`/api/admin/notifications${qs}`, { credentials: "include" });
  const json = await parseJson<{ notifications: CrmNotification[] }>(res);
  return json.notifications;
}

export async function markAdminNotificationsRead(ids: string[]): Promise<void> {
  const res = await fetch("/api/admin/notifications", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  await parseJson<{ success: boolean }>(res);
}

export async function fetchPortalBillingNotifications(since?: string): Promise<CrmNotification[]> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : "";
  const res = await fetch(`/api/espace-client/notifications${qs}`, { credentials: "include" });
  const json = await parseJson<{ notifications: CrmNotification[] }>(res);
  return json.notifications;
}

export async function markPortalNotificationsRead(ids: string[]): Promise<void> {
  const res = await fetch("/api/espace-client/notifications", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  await parseJson<{ success: boolean }>(res);
}

export type { CrmNotification };
