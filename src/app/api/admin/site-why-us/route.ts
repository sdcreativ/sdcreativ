import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getSiteWhyUsSettingsForAdmin,
  updateSiteWhyUsSchema,
  updateSiteWhyUsSettings,
} from "@/lib/site-why-us-settings";
import { revalidateHomeSectionsPages } from "@/lib/site-revalidate";
import { NextResponse } from "next/server";

export async function GET() {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;

  const whyUs = await getSiteWhyUsSettingsForAdmin();
  return NextResponse.json({ whyUs });
}

export async function PATCH(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = updateSiteWhyUsSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const whyUs = await updateSiteWhyUsSettings(parsed.data);
    revalidateHomeSectionsPages();
    return NextResponse.json({ whyUs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mise à jour impossible.";
    console.error("[api/admin/site-why-us] PATCH", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
