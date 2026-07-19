import { requireAdminAuth } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { getCommunicationsStats } from "@/lib/communications-stats";
import { REPORT_PERIODS, type ReportPeriod } from "@/content/reports-labels";
import type { CommunicationChannel } from "@/lib/threecx/journal";

const CHANNELS = ["all", "chat", "call", "meeting"] as const;

export async function GET(request: Request) {
  const authError = await requireAdminAuth({
    anyPermission: ["reports.view", "communications.read"],
  });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rawPeriod = searchParams.get("period") ?? "month";
    const period = (REPORT_PERIODS.includes(rawPeriod as ReportPeriod)
      ? rawPeriod
      : "month") as ReportPeriod;
    const rawChannel = searchParams.get("channel") ?? "all";
    const channel = (CHANNELS.includes(rawChannel as (typeof CHANNELS)[number])
      ? rawChannel
      : "all") as CommunicationChannel | "all";

    const stats = await getCommunicationsStats({ period, channel });
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("[api/admin/reports/communications] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
