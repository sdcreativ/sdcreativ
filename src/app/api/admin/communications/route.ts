import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { listCommunicationEvents } from "@/lib/communications";
import type { CommunicationChannel } from "@/lib/threecx/journal";

export async function GET(request: Request) {
  const denied = await requireAdminAuth({ permission: "communications.read" });
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const channelRaw = searchParams.get("channel") ?? "all";
  const channel = (
    ["all", "chat", "call", "meeting"] as const
  ).includes(channelRaw as CommunicationChannel | "all")
    ? (channelRaw as CommunicationChannel | "all")
    : "all";

  try {
    const result = await listCommunicationEvents({
      channel,
      leadId: searchParams.get("leadId") ?? undefined,
      clientId: searchParams.get("clientId") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      page: Number(searchParams.get("page") ?? "1"),
      pageSize: Number(searchParams.get("pageSize") ?? "20"),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[communications] list failed:", error);
    return NextResponse.json({ error: "Erreur liste communications." }, { status: 500 });
  }
}
