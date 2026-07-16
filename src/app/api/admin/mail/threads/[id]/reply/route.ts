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
  bodyText: z.string().trim().max(100_000).default(""),
  bodyHtml: z.string().max(500_000).nullable().optional(),
  includeSignature: z.boolean().optional(),
  mode: z.enum(["reply", "replyAll", "forward"]).optional(),
  to: z.union([z.string().trim(), z.array(z.string().trim())]).optional(),
  cc: z.union([z.string().trim(), z.array(z.string().trim())]).optional(),
  bcc: z.union([z.string().trim(), z.array(z.string().trim())]).optional(),
  subject: z.string().trim().max(500).optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string().trim().min(1).max(260),
        contentType: z.string().trim().max(160).default("application/octet-stream"),
        contentBase64: z.string().min(1).max(8_000_000),
      }),
    )
    .max(8)
    .optional(),
});

function splitAddresses(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined;
  const parts = Array.isArray(value) ? value : value.split(/[,;\s]+/);
  const emails = parts.map((p) => p.trim()).filter(Boolean);
  return emails.length ? emails : undefined;
}

/** Réponse / reply-all / forward SMTP Hostinger. Permission mail.write. */
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
    const mode = parsed.data.mode ?? "reply";
    const result = await replyToMailThread({
      threadId: id,
      bodyText: parsed.data.bodyText,
      bodyHtml: parsed.data.bodyHtml,
      includeSignature: parsed.data.includeSignature,
      userId: session?.userId,
      mode,
      to: splitAddresses(parsed.data.to),
      cc: splitAddresses(parsed.data.cc),
      bcc: splitAddresses(parsed.data.bcc),
      subject: parsed.data.subject,
      attachments: parsed.data.attachments,
    });

    await auditCrmAction({
      action: mode,
      entityType: "mail_thread",
      entityId: result.message.threadId,
      summary: `${mode} messagerie → ${result.to.join(", ")}`,
      metadata: {
        messageId: result.message.id,
        smtpMessageId: result.smtpMessageId,
        to: result.to,
        cc: result.cc,
        actor: session?.email ?? session?.name ?? null,
      },
    });

    return NextResponse.json({
      message: result.message,
      thread: result.thread ?? null,
      to: result.to,
      cc: result.cc,
    });
  } catch (error) {
    const message = sanitizeMailError(error, "Échec de l’envoi.");
    console.error("[api/admin/mail/threads/[id]/reply] POST", message);
    const status =
      message.includes("introuvable") || message.includes("archivée")
        ? 404
        : message.includes("vide") ||
            message.includes("destinataire") ||
            message.includes("transfert") ||
            message.includes("Pièce")
          ? 400
          : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
