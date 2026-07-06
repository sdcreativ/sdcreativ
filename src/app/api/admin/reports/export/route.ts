import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { buildReportsCsv, getMonthlyExportRows } from "@/lib/reports";

export async function GET(request: Request) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const months = Math.min(24, Math.max(1, Number(searchParams.get("months") ?? 12)));

    const rows = await getMonthlyExportRows(months);
    const csv = buildReportsCsv(rows);
    const filename = `sdcreativ-rapports-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[api/admin/reports/export] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
