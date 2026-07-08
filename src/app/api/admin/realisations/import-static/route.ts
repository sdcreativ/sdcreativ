import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { importStaticRealisations } from "@/lib/public-realisations";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidateRealisationsPages } from "@/lib/site-revalidate";

export async function POST() {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const result = await importStaticRealisations();
  if (result.imported > 0) revalidateRealisationsPages();
  return NextResponse.json(result);
}
