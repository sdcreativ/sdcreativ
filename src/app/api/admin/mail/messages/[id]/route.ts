import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { auditCrmAction } from "@/lib/crm-audit-actions";
import { isDatabaseConfigured } from "@/lib/db";
import { softDeleteMailMessages } from "@/lib/mail/repository";

type RouteContext = { params: Promise<{ id: string }> };

/** Soft-delete d’un message. Permission mail.write. */
export async function DELETE(_request: Request, context: RouteContext) {
  const authError = await requireAdminAuth({ permission: "mail.write" });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const result = await softDeleteMailMessages([id]);
    if (result.deleted === 0) {
      return NextResponse.json({ error: "Message introuvable." }, { status: 404 });
    }

    await auditCrmAction({
      action: "delete",
      entityType: "mail_message",
      entityId: id,
      summary: "Message messagerie supprimé",
      metadata: {
        threadIds: result.threadIds,
        threadsDeleted: result.threadsDeleted,
      },
    });

    return NextResponse.json({
      ok: true,
      deleted: result.deleted,
      threadsDeleted: result.threadsDeleted,
    });
  } catch (error) {
    console.error("[api/admin/mail/messages/[id]] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
