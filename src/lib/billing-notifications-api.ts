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

export async function fetchAdminNotificationHistory(): Promise<{
  notifications: CrmNotification[];
  unreadCount: number;
}> {
  const res = await fetch("/api/admin/notifications?history=1", { credentials: "include" });
  return parseJson<{ notifications: CrmNotification[]; unreadCount: number }>(res);
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

export async function markAllAdminNotificationsRead(): Promise<void> {
  const res = await fetch("/api/admin/notifications", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ all: true }),
  });
  await parseJson<{ success: boolean }>(res);
}

export async function fetchPortalBillingNotifications(since?: string): Promise<CrmNotification[]> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : "";
  const res = await fetch(`/api/espace-client/notifications${qs}`, { credentials: "include" });
  const json = await parseJson<{ notifications: CrmNotification[] }>(res);
  return json.notifications;
}

export async function fetchPortalNotificationHistory(): Promise<{
  notifications: CrmNotification[];
  unreadCount: number;
}> {
  const res = await fetch("/api/espace-client/notifications?history=1", { credentials: "include" });
  return parseJson<{ notifications: CrmNotification[]; unreadCount: number }>(res);
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

export async function markAllPortalNotificationsRead(): Promise<void> {
  const res = await fetch("/api/espace-client/notifications", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ all: true }),
  });
  await parseJson<{ success: boolean }>(res);
}

export type { CrmNotification };
