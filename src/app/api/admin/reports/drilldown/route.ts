import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { REPORT_PERIODS, type ReportPeriod } from "@/content/reports-labels";
import { LEAD_SOURCES } from "@/lib/leads";
import {
  getLeadsBySourceDrilldown,
  getReportDrilldown,
  type DrilldownEntity,
} from "@/lib/reports-drilldown";

const ENTITIES: DrilldownEntity[] = ["leads", "quotes", "projects", "tasks"];

export async function GET(request: Request) {
  const authError = await crmApiAuth.reports.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rawPeriod = searchParams.get("period") ?? "month";
    const period = (REPORT_PERIODS.includes(rawPeriod as ReportPeriod) ? rawPeriod : "month") as ReportPeriod;
    const assignee = searchParams.get("assignee")?.trim() || undefined;
    const clientId = searchParams.get("clientId")?.trim() || undefined;
    const key = searchParams.get("key")?.trim();
    const source = searchParams.get("source")?.trim();

    if (source) {
      if (!LEAD_SOURCES.includes(source as (typeof LEAD_SOURCES)[number])) {
        return NextResponse.json({ error: "Source invalide." }, { status: 400 });
      }
      const items = await getLeadsBySourceDrilldown(source as (typeof LEAD_SOURCES)[number], period);
      return NextResponse.json({ items, listHref: `/admin/crm/leads?source=${encodeURIComponent(source)}` });
    }

    const entity = searchParams.get("entity") as DrilldownEntity | null;
    if (!entity || !ENTITIES.includes(entity) || !key) {
      return NextResponse.json({ error: "Paramètres entity et key requis." }, { status: 400 });
    }

    const items = await getReportDrilldown({
      entity,
      key,
      period,
      filters: { assignee, clientId },
    });

    const listHref = (() => {
      switch (entity) {
        case "leads":
          return `/admin/crm/leads?status=${encodeURIComponent(key)}`;
        case "quotes":
          return `/admin/crm/devis?status=${encodeURIComponent(key)}`;
        case "projects":
          return `/admin/crm/projets?status=${encodeURIComponent(key)}`;
        case "tasks":
          return `/admin/crm/taches?assignee=${encodeURIComponent(key)}`;
      }
    })();

    return NextResponse.json({ items, listHref });
  } catch (error) {
    console.error("[api/admin/reports/drilldown] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
