import type { NewsletterSubscriber, WaitlistEntry } from "@/lib/marketing-subscribers";
import type { MarketingSequence } from "@/lib/marketing-sequences";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  const res = await fetch("/api/admin/marketing/subscribers", { credentials: "include" });
  const json = await parseFetchJson<{ subscribers: NewsletterSubscriber[] }>(res);
  return json.subscribers;
}

export async function fetchMarketingSequences(): Promise<MarketingSequence[]> {
  const res = await fetch("/api/admin/marketing-sequences", { credentials: "include" });
  const json = await parseFetchJson<{ sequences: MarketingSequence[] }>(res);
  return json.sequences ?? [];
}

export async function patchMarketingSequenceApi(
  id: string,
  input: { isActive: boolean },
): Promise<void> {
  const res = await fetch("/api/admin/marketing-sequences", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...input }),
  });
  await parseFetchJson(res);
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
