import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getSiteFormationsSettingsForAdmin,
  updateSiteFormationsSchema,
  updateSiteFormationsSettings,
} from "@/lib/site-formations-settings";
import { revalidateFormationsPages } from "@/lib/site-revalidate";
import { NextResponse } from "next/server";

export async function GET() {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;
  return NextResponse.json({ content: await getSiteFormationsSettingsForAdmin() });
}

export async function PATCH(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }
  try {
    const parsed = updateSiteFormationsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const content = await updateSiteFormationsSettings(parsed.data);
    revalidateFormationsPages();
    return NextResponse.json({ content });
  } catch (error) {
    console.error("[api/admin/site-formations] PATCH", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mise à jour impossible." },
      { status: 400 },
    );
  }
}
