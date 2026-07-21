import type { NewsletterSubscriber, WaitlistEntry } from "@/lib/marketing-subscribers";
import type { MarketingSequence } from "@/lib/marketing-sequences";
import type {
  PromoAudiencePreview,
  PromoCampaign,
  PromoEnrollment,
} from "@/lib/promo-campaigns";
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

export async function fetchPromoCampaigns(): Promise<PromoCampaign[]> {
  const res = await fetch("/api/admin/promo-campaigns", { credentials: "include" });
  const json = await parseFetchJson<{ campaigns: PromoCampaign[] }>(res);
  return json.campaigns ?? [];
}

export async function fetchPromoAudiencePreview(): Promise<PromoAudiencePreview[]> {
  const res = await fetch("/api/admin/promo-campaigns?audience=1", { credentials: "include" });
  const json = await parseFetchJson<{ audience: PromoAudiencePreview[] }>(res);
  return json.audience ?? [];
}

export async function createPromoCampaignApi(input: {
  name: string;
  offerTitle: string;
  offerDescription?: string;
  startsAt: string;
  endsAt: string;
  emailSubject?: string;
  emailHtml?: string;
}): Promise<PromoCampaign> {
  const res = await fetch("/api/admin/promo-campaigns", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ campaign: PromoCampaign }>(res);
  return json.campaign;
}

export async function updatePromoCampaignApi(
  id: string,
  input: Partial<{
    name: string;
    offerTitle: string;
    offerDescription: string;
    startsAt: string;
    endsAt: string;
    status: PromoCampaign["status"];
    emailSubject: string;
    emailHtml: string;
  }>,
): Promise<PromoCampaign> {
  const res = await fetch(`/api/admin/promo-campaigns/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ campaign: PromoCampaign }>(res);
  return json.campaign;
}

export async function syncPromoCampaignApi(id: string): Promise<{ added: number }> {
  const res = await fetch(`/api/admin/promo-campaigns/${id}/sync`, {
    method: "POST",
    credentials: "include",
  });
  return parseFetchJson<{ added: number }>(res);
}

export async function sendPromoCampaignApi(
  id: string,
  limit?: number,
): Promise<{ sent: number; skipped: number }> {
  const res = await fetch(`/api/admin/promo-campaigns/${id}/send`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limit }),
  });
  return parseFetchJson<{ sent: number; skipped: number }>(res);
}

export async function fetchPromoCampaignDetail(
  id: string,
): Promise<{ campaign: PromoCampaign; enrollments: PromoEnrollment[] }> {
  const res = await fetch(`/api/admin/promo-campaigns/${id}`, { credentials: "include" });
  return parseFetchJson<{ campaign: PromoCampaign; enrollments: PromoEnrollment[] }>(res);
}
