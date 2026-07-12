import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { buildAccountingCsv, getAccountingExportRows } from "@/lib/accounting-export";

export async function GET(request: Request) {
  const authError = await crmApiAuth.reports.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rows = await getAccountingExportRows({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      clientId: searchParams.get("clientId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    const format = searchParams.get("format") ?? "json";
    if (format === "csv") {
      const csv = buildAccountingCsv(rows);
      const filename = `export-comptable-${new Date().toISOString().slice(0, 10)}.csv`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ rows, count: rows.length });
  } catch (error) {
    console.error("[api/admin/accounting/export] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
