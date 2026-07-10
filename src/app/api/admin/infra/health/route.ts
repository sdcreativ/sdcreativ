import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { getInfraHealth } from "@/lib/infra-health";

export async function GET() {
  const authError = await crmApiAuth.infra.read();
  if (authError) return authError;

  try {
    const health = await getInfraHealth();
    return NextResponse.json({ health });
  } catch (error) {
    console.error("[api/admin/infra/health] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
