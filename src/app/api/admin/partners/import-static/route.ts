import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { importStaticPartners } from "@/lib/public-partners";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidatePartnersPages } from "@/lib/site-revalidate";

export async function POST() {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  try {
    const result = await importStaticPartners();
    if (result.imported > 0) revalidatePartnersPages();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import impossible." }, { status: 400 });
  }
}
