import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import {
  getSiteQuoteConfigSettingsForAdmin,
  updateSiteQuoteConfigSchema,
  updateSiteQuoteConfigSettings,
} from "@/lib/site-quote-config-settings";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidateDevisPages } from "@/lib/site-revalidate";

export async function GET() {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;

  const config = await getSiteQuoteConfigSettingsForAdmin();
  return NextResponse.json({ config });
}

export async function PATCH(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = updateSiteQuoteConfigSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const config = await updateSiteQuoteConfigSettings(parsed.data);
    revalidateDevisPages();
    return NextResponse.json({ config });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mise à jour impossible.";
    console.error("[api/admin/site-quote-config] PATCH", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
