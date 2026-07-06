import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { auditCrmAction, usersManageAuth } from "@/lib/crm-audit-actions";
import { resendUserInvitation } from "@/lib/crm-users";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const authError = await usersManageAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const result = await resendUserInvitation(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Envoi impossible." }, { status: 400 });
    }

    await auditCrmAction({
      action: "update",
      entityType: "user",
      entityId: id,
      summary: "Invitation CRM renvoyée",
      metadata: { invitationSent: result.invitationSent },
    });

    return NextResponse.json({
      success: true,
      invitationSent: result.invitationSent,
    });
  } catch (error) {
    console.error("[api/admin/users/[id]/resend-invitation] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
