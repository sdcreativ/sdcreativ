import type { NewsletterSubscriber, WaitlistEntry } from "@/lib/marketing-subscribers";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  const res = await fetch("/api/admin/marketing/subscribers", { credentials: "include" });
  const json = await parseFetchJson<{ subscribers: NewsletterSubscriber[] }>(res);
  return json.subscribers;
}

export async function patchNewsletterSubscriberApi(
  id: string,
  action: "unsubscribe" | "delete",
): Promise<void> {
  const res = await fetch("/api/admin/marketing/subscribers", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, action }),
  });
  await parseFetchJson<{ success: boolean }>(res);
}

export async function fetchWaitlistEntries(): Promise<WaitlistEntry[]> {
  const res = await fetch("/api/admin/marketing/waitlist", { credentials: "include" });
  const json = await parseFetchJson<{ entries: WaitlistEntry[] }>(res);
  return json.entries;
}

export async function deleteWaitlistEntryApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/marketing/waitlist?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson<{ success: boolean }>(res);
}
