import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_KADY_APPEARANCE, kadyAppearanceSchema } from "@/lib/kady-appearance";
import { getKadyAppearanceForAdmin, updateKadyAppearance } from "@/lib/kady-settings";
import { revalidateKadyAppearance } from "@/lib/site-revalidate";

export async function GET() {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;
  return NextResponse.json({ appearance: await getKadyAppearanceForAdmin(), defaults: DEFAULT_KADY_APPEARANCE });
}

export async function PATCH(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }
  try {
    const parsed = kadyAppearanceSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }
    const appearance = await updateKadyAppearance(parsed.data);
    revalidateKadyAppearance();
    return NextResponse.json({ appearance });
  } catch (error) {
    console.error("[api/admin/site-kady] PATCH", error);
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 });
  }
}
