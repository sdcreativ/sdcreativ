import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { resetSiteMaintenanceSettings } from "@/lib/site-maintenance-settings";
import { revalidateMaintenancePages } from "@/lib/site-revalidate";
import { NextResponse } from "next/server";

export async function POST() {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }
  const content = await resetSiteMaintenanceSettings();
  revalidateMaintenancePages();
  return NextResponse.json({ content });
}
