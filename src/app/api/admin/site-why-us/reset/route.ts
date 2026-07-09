import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { resetSiteWhyUsSettings } from "@/lib/site-why-us-settings";
import { revalidateHomeSectionsPages } from "@/lib/site-revalidate";
import { NextResponse } from "next/server";

export async function POST() {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  const whyUs = await resetSiteWhyUsSettings();
  revalidateHomeSectionsPages();
  return NextResponse.json({ whyUs });
}
