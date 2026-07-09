import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getSiteMethodSettingsForAdmin,
  updateSiteMethodSchema,
  updateSiteMethodSettings,
} from "@/lib/site-method-settings";
import { revalidateHomeSectionsPages } from "@/lib/site-revalidate";
import { NextResponse } from "next/server";

export async function GET() {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;

  const method = await getSiteMethodSettingsForAdmin();
  return NextResponse.json({ method });
}

export async function PATCH(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = updateSiteMethodSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const method = await updateSiteMethodSettings(parsed.data);
    revalidateHomeSectionsPages();
    return NextResponse.json({ method });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mise à jour impossible.";
    console.error("[api/admin/site-method] PATCH", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
