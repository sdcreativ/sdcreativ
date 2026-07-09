import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { resetSiteCareersSettings } from "@/lib/site-careers-settings";
import { revalidateCareersPages } from "@/lib/site-revalidate";
import { NextResponse } from "next/server";

export async function POST() {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  const careers = await resetSiteCareersSettings();
  revalidateCareersPages();
  return NextResponse.json({ careers });
}
