import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { deleteFacebookPageConnection } from "@/lib/facebook-page";
import { getAdminSession } from "@/lib/admin-auth";
import { logCrmAudit } from "@/lib/crm-audit";

export async function DELETE() {
  const authError = await crmApiAuth.settings.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    await deleteFacebookPageConnection();
    const session = await getAdminSession();
    await logCrmAudit({
      actor: {
        userId: session?.userId && session.userId !== "legacy" ? session.userId : null,
        name: session?.name ?? "Admin",
        email: session?.email ?? null,
      },
      action: "facebook.disconnect",
      entityType: "facebook_page",
      summary: "Déconnexion de la Page Facebook",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/facebook/oauth] DELETE", error);
    return NextResponse.json({ error: "Déconnexion impossible." }, { status: 500 });
  }
}
