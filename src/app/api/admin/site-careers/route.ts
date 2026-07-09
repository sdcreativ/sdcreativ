import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getSiteCareersSettingsForAdmin,
  updateSiteCareersSchema,
  updateSiteCareersSettings,
} from "@/lib/site-careers-settings";
import { revalidateCareersPages } from "@/lib/site-revalidate";
import { NextResponse } from "next/server";

export async function GET() {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;

  const careers = await getSiteCareersSettingsForAdmin();
  return NextResponse.json({ careers });
}

export async function PATCH(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = updateSiteCareersSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const careers = await updateSiteCareersSettings(parsed.data);
    revalidateCareersPages();
    return NextResponse.json({ careers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mise à jour impossible.";
    console.error("[api/admin/site-careers] PATCH", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
