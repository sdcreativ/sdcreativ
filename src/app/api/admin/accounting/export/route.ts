import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { buildAccountingExport } from "@/lib/accounting-fec";

export async function GET(request: Request) {
  const authError = await crmApiAuth.reports.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") ?? "json") as "csv" | "fec" | "ci-csv" | "json";
    const result = await buildAccountingExport({
      format,
      filters: {
        from: searchParams.get("from") ?? undefined,
        to: searchParams.get("to") ?? undefined,
        clientId: searchParams.get("clientId") ?? undefined,
        status: searchParams.get("status") ?? undefined,
        legalEntityId: searchParams.get("legalEntityId") ?? undefined,
      },
    });

    if ("rows" in result) {
      return NextResponse.json(result);
    }

    return new NextResponse(result.body, {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error("[api/admin/accounting/export] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
