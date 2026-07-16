import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { auditCrmAction } from "@/lib/crm-audit-actions";
import { isDatabaseConfigured } from "@/lib/db";
import { isMailCredentialsSecretConfigured } from "@/lib/mail/config";
import { syncMailboxById } from "@/lib/mail/sync";

type RouteContext = { params: Promise<{ id: string }> };

/** Sync manuelle d’une boîte (force, ignore MAIL_SYNC_ENABLED). */
export async function POST(_request: Request, context: RouteContext) {
  const authError = await requireAdminAuth({
    anyPermission: ["mail.manage", "mail.write"],
  });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  if (!isMailCredentialsSecretConfigured()) {
    return NextResponse.json(
      { error: "MAIL_CREDENTIALS_SECRET manquant." },
      { status: 503 },
    );
  }

  try {
    const { id } = await context.params;
    const result = await syncMailboxById(id);

    await auditCrmAction({
      action: "sync",
      entityType: "mail_mailbox",
      entityId: id,
      summary: result.error
        ? `Sync messagerie échouée : ${result.email || id}`
        : `Sync messagerie : ${result.inserted} message(s) pour ${result.email}`,
      metadata: {
        fetched: result.fetched,
        inserted: result.inserted,
        skipped: result.skipped,
        error: result.error ?? null,
      },
    });

    if (result.error && result.fetched === 0 && result.inserted === 0) {
      return NextResponse.json({ result }, { status: 502 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("[api/admin/mail/mailboxes/[id]/sync] POST", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
