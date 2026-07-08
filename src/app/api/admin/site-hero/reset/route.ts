import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { resetSiteHeroSettings } from "@/lib/site-hero-settings";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidateHeroPages } from "@/lib/site-revalidate";

export async function POST() {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const hero = await resetSiteHeroSettings();
    revalidateHeroPages();
    return NextResponse.json({ hero });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Réinitialisation impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
