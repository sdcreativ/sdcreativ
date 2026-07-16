import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { auditCrmAction } from "@/lib/crm-audit-actions";
import { isDatabaseConfigured } from "@/lib/db";
import { isMailCredentialsSecretConfigured } from "@/lib/mail/config";
import { replyToMailThread } from "@/lib/mail/reply";
import { sanitizeMailError } from "@/lib/mail/sanitize-error";

type RouteContext = { params: Promise<{ id: string }> };

const replySchema = z.object({
  bodyText: z.string().trim().min(1).max(100_000),
  bodyHtml: z.string().max(500_000).nullable().optional(),
  includeSignature: z.boolean().optional(),
});

/** Réponse SMTP Hostinger + enregistrement outbound. Permission mail.write. */
export async function POST(request: Request, context: RouteContext) {
  const authError = await requireAdminAuth({ permission: "mail.write" });
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
    const body = await request.json();
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }

    const session = await getAdminSession();
    const result = await replyToMailThread({
      threadId: id,
      bodyText: parsed.data.bodyText,
      bodyHtml: parsed.data.bodyHtml,
      includeSignature: parsed.data.includeSignature,
      userId: session?.userId,
    });

    await auditCrmAction({
      action: "reply",
      entityType: "mail_thread",
      entityId: id,
      summary: `Réponse messagerie → ${result.to.join(", ")}`,
      metadata: {
        messageId: result.message.id,
        smtpMessageId: result.smtpMessageId,
        to: result.to,
        actor: session?.email ?? session?.name ?? null,
      },
    });

    return NextResponse.json({
      message: result.message,
      to: result.to,
    });
  } catch (error) {
    const message = sanitizeMailError(error, "Échec de l’envoi.");
    console.error("[api/admin/mail/threads/[id]/reply] POST", message);
    const status =
      message.includes("introuvable") || message.includes("archivée")
        ? 404
        : message.includes("vide") || message.includes("destinataire")
          ? 400
          : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
