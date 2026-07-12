import type { Subscription } from "@/lib/subscriptions";

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

export async function fetchSubscriptions(clientId?: string): Promise<Subscription[]> {
  const qs = clientId ? `?clientId=${clientId}` : "";
  const res = await fetch(`/api/admin/subscriptions${qs}`, { credentials: "include" });
  const json = await parseJson<{ subscriptions: Subscription[] }>(res);
  return json.subscriptions;
}

export async function createSubscriptionApi(input: Record<string, unknown>): Promise<Subscription> {
  const res = await fetch("/api/admin/subscriptions", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ subscription: Subscription }>(res);
  return json.subscription;
}

export async function updateSubscriptionApi(
  id: string,
  input: Record<string, unknown>,
): Promise<Subscription> {
  const res = await fetch(`/api/admin/subscriptions/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ subscription: Subscription }>(res);
  return json.subscription;
}
