import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getReportsSummary, buildReportsComparison, resolvePreviousPeriod } from "@/lib/reports";
import { REPORT_PERIODS, type ReportPeriod } from "@/content/reports-labels";

export async function GET(request: Request) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("period") ?? "month";
    const period = (REPORT_PERIODS.includes(raw as ReportPeriod) ? raw : "month") as ReportPeriod;
    const assignee = searchParams.get("assignee")?.trim() || undefined;
    const clientId = searchParams.get("clientId")?.trim() || undefined;
    const compare = searchParams.get("compare") === "1";

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

    return NextResponse.json({ summary, comparison });
  } catch (error) {
    console.error("[api/admin/reports] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
