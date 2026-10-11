import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { ACQUISITION_PERIODS, getAcquisitionReport, type AcquisitionPeriod } from "@/lib/marketing-events";

export async function GET(request: Request) {
  const authError = await crmApiAuth.marketing.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  const requested = Number(new URL(request.url).searchParams.get("days"));
  const days: AcquisitionPeriod = (ACQUISITION_PERIODS as readonly number[]).includes(requested)
    ? (requested as AcquisitionPeriod)
    : 90;

  try {
    const report = await getAcquisitionReport(days);
    return NextResponse.json({ report });
  } catch (error) {
    console.error("[api/admin/marketing/acquisition] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
