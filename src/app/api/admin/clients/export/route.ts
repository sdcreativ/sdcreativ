import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { buildClientsCsv } from "@/lib/clients-export";
import { listClientsFiltered, type ClientListFilters } from "@/lib/clients";
import { CLIENT_STATUSES, type ClientStatus } from "@/content/clients-labels";

export async function GET(request: Request) {
  const authError = await crmApiAuth.clients.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ClientStatus | null;
    const accountManager = searchParams.get("accountManager")?.trim() || undefined;
    const sector = searchParams.get("sector")?.trim() || undefined;
    const tag = searchParams.get("tag")?.trim() || undefined;
    const q = searchParams.get("q")?.trim() || undefined;
    const revenueMin = searchParams.get("revenueMin") ? Number(searchParams.get("revenueMin")) : undefined;
    const revenueMax = searchParams.get("revenueMax") ? Number(searchParams.get("revenueMax")) : undefined;

    const filters: ClientListFilters = {
      status: status && CLIENT_STATUSES.includes(status) ? status : undefined,
      accountManager,
      sector,
      tag,
      q,
      revenueMin: revenueMin && !Number.isNaN(revenueMin) ? revenueMin : undefined,
      revenueMax: revenueMax && !Number.isNaN(revenueMax) ? revenueMax : undefined,
    };

    const clients = await listClientsFiltered(filters);
    const csv = buildClientsCsv(clients);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="clients-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("[api/admin/clients/export] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
