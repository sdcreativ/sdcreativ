import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { getReportsSummary, buildReportsComparison, resolvePreviousPeriod } from "@/lib/reports";
import { buildReportsPdfHtml } from "@/lib/reports-pdf";
import type { ReportPeriod } from "@/content/reports-labels";
import { htmlToPdfResponse } from "@/lib/server-pdf";

export async function GET(request: Request) {
  const authError = await crmApiAuth.reports.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") ?? "month") as ReportPeriod;
    const assignee = searchParams.get("assignee")?.trim() || undefined;
    const clientId = searchParams.get("clientId")?.trim() || undefined;
    const compare = searchParams.get("compare") === "1";
    const preferHtml = searchParams.get("format") === "html";
    const filters = { assignee, clientId };
    const summary = await getReportsSummary(period, filters);

    let comparison = null;
    if (compare) {
      const previousRange = resolvePreviousPeriod(period);
      if (previousRange) {
        const previousSummary = await getReportsSummary(period, filters, previousRange);
        comparison = buildReportsComparison(
          summary.kpis,
          previousSummary.kpis,
          previousRange.label,
        );
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
    const html = buildReportsPdfHtml(summary, siteUrl, comparison);
    const filename = `rapports-${period}-${new Date().toISOString().slice(0, 10)}`;

    return htmlToPdfResponse(html, filename, { preferHtml });
  } catch (error) {
    console.error("[api/admin/reports/pdf] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
