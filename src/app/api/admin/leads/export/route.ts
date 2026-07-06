import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { buildLeadsCsv, buildLeadsPdfHtml } from "@/lib/leads-export";
import { LEAD_SOURCES, LEAD_STATUSES, listAllLeadsForExport, type LeadSource, type LeadStatus } from "@/lib/leads";

export async function GET(request: Request) {
  const authError = await requireAdminAuth({ permission: "leads.read" });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "csv";
    const status = searchParams.get("status") as LeadStatus | null;
    const source = searchParams.get("source") as LeadSource | null;
    const assignee = searchParams.get("assignee")?.trim() || undefined;
    const q = searchParams.get("q")?.trim() || undefined;
    const dateFrom = searchParams.get("dateFrom")?.trim() || undefined;
    const dateTo = searchParams.get("dateTo")?.trim() || undefined;
    const budgetMin = searchParams.get("budgetMin") ? Number(searchParams.get("budgetMin")) : undefined;

    const filters = {
      status: status && LEAD_STATUSES.includes(status) ? status : undefined,
      source: source && LEAD_SOURCES.includes(source) ? source : undefined,
      assignee,
      q,
      dateFrom,
      dateTo,
      budgetMin: budgetMin && !Number.isNaN(budgetMin) ? budgetMin : undefined,
    };

    const leads = await listAllLeadsForExport(filters);

    if (format === "pdf") {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
      const html = buildLeadsPdfHtml(leads, siteUrl);
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-cache",
        },
      });
    }

    const csv = buildLeadsCsv(leads);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("[api/admin/leads/export] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
