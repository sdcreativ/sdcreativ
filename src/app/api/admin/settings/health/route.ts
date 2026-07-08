import { getAdminSession } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { getSettingsHealth } from "@/lib/settings-health";

export async function GET() {
  const authError = await crmApiAuth.settingsAccess();
  if (authError) return authError;

  try {
    const session = await getAdminSession();
    const health = await getSettingsHealth(
      session ? { name: session.name, role: session.role } : null,
    );
    return NextResponse.json({ health });
  } catch (error) {
    console.error("[api/admin/settings/health] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
