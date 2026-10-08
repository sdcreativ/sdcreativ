import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { listClientBenefits } from "@/lib/client-benefits";

export async function GET() {
  const authError = await crmApiAuth.clients.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  return NextResponse.json({ benefits: await listClientBenefits() });
}
