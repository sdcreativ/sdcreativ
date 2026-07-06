import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getCrmSecuritySettings,
  securitySchema,
  updateCrmSecuritySettings,
} from "@/lib/crm-security-settings";

export async function GET() {
  const authError = await requireAdminAuth({ roles: ["admin"] });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const security = await getCrmSecuritySettings();
    return NextResponse.json({ security });
  } catch (error) {
    console.error("[api/admin/settings/security] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authError = await requireAdminAuth({ roles: ["admin"], write: true });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = securitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }
    const security = await updateCrmSecuritySettings(parsed.data);
    return NextResponse.json({ security });
  } catch (error) {
    console.error("[api/admin/settings/security] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
