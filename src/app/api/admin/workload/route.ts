import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getCommercialWorkload } from "@/lib/workload";

export async function GET() {
  const authError = await crmApiAuth.reports.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const snapshot = await getCommercialWorkload();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("[api/admin/workload] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
