import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { resetSiteMethodSettings } from "@/lib/site-method-settings";
import { revalidateHomeSectionsPages } from "@/lib/site-revalidate";
import { NextResponse } from "next/server";

export async function POST() {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  const method = await resetSiteMethodSettings();
  revalidateHomeSectionsPages();
  return NextResponse.json({ method });
}
