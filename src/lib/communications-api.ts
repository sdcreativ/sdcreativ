import type { CommunicationListItem } from "@/lib/communications";
import type { CommunicationChannel } from "@/lib/threecx/journal";

export type CommunicationsListResponse = {
  items: CommunicationListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export async function fetchCommunications(params: {
  channel?: CommunicationChannel | "all";
  leadId?: string;
  clientId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<CommunicationsListResponse> {
  const sp = new URLSearchParams();
  if (params.channel) sp.set("channel", params.channel);
  if (params.leadId) sp.set("leadId", params.leadId);
  if (params.clientId) sp.set("clientId", params.clientId);
  if (params.q) sp.set("q", params.q);
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));

  const res = await fetch(`/api/admin/communications?${sp}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Impossible de charger les communications.");
  }
  return (await res.json()) as CommunicationsListResponse;
}

export async function fetchThreeCxWebClientUrl(): Promise<string | null> {
  const res = await fetch("/api/admin/communications/web-client", {
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { url?: string | null };
  return data.url ?? null;
}
