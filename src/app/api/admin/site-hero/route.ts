import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import {
  getSiteHeroSettingsForAdmin,
  updateSiteHeroSchema,
  updateSiteHeroSettings,
} from "@/lib/site-hero-settings";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidateHeroPages } from "@/lib/site-revalidate";

export async function GET() {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;

  const hero = await getSiteHeroSettingsForAdmin();
  return NextResponse.json({ hero });
}

export async function PATCH(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = updateSiteHeroSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const hero = await updateSiteHeroSettings(parsed.data);
    revalidateHeroPages();
    return NextResponse.json({ hero });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mise à jour impossible.";
    console.error("[api/admin/site-hero] PATCH", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
