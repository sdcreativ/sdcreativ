import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getSitePageHeroesSettingsForAdmin,
  updateSitePageHeroesSchema,
  updateSitePageHeroesSettings,
} from "@/lib/site-page-heroes-settings";
import { revalidatePageHeroesPages } from "@/lib/site-revalidate";
import { NextResponse } from "next/server";

export async function GET() {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;

  const heroes = await getSitePageHeroesSettingsForAdmin();
  return NextResponse.json({ heroes });
}

export async function PATCH(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = updateSitePageHeroesSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const heroes = await updateSitePageHeroesSettings(parsed.data);
    revalidatePageHeroesPages();
    return NextResponse.json({ heroes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mise à jour impossible.";
    console.error("[api/admin/site-page-heroes] PATCH", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
