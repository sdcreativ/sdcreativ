import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { auditCrmAction } from "@/lib/crm-audit-actions";
import { isDatabaseConfigured } from "@/lib/db";
import { isMailCredentialsSecretConfigured } from "@/lib/mail/config";
import { composeNewMail } from "@/lib/mail/compose";
import {
  countUnreadMailThreads,
  listMailThreads,
} from "@/lib/mail/repository";
import { sanitizeMailError } from "@/lib/mail/sanitize-error";
import type { CrmMailThreadStatus } from "@/lib/mail/types";

const STATUSES = new Set<CrmMailThreadStatus>(["open", "archived"]);

const composeSchema = z.object({
  mailboxId: z.string().uuid(),
  to: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1)).min(1)]),
  cc: z.union([z.string().trim(), z.array(z.string().trim())]).optional(),
  subject: z.string().trim().max(500).default(""),
  bodyText: z.string().trim().min(1).max(100_000),
  bodyHtml: z.string().max(500_000).nullable().optional(),
  includeSignature: z.boolean().optional(),
});

function splitAddresses(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const parts = Array.isArray(value) ? value : value.split(/[,;\s]+/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

export async function GET(request: Request) {
  const authError = await requireAdminAuth({ permission: "mail.read" });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const mailboxId = searchParams.get("mailboxId")?.trim() || undefined;
    const statusRaw = searchParams.get("status")?.trim();
    const status =
      statusRaw && STATUSES.has(statusRaw as CrmMailThreadStatus)
        ? (statusRaw as CrmMailThreadStatus)
        : undefined;
    const unreadOnly = searchParams.get("unreadOnly") === "1";
    const search = searchParams.get("search")?.trim() || undefined;
    const clientId = searchParams.get("clientId")?.trim() || undefined;
    const leadId = searchParams.get("leadId")?.trim() || undefined;
    const limitRaw = Number(searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(limitRaw) ? limitRaw : 50;

    const [threads, unreadCount] = await Promise.all([
      listMailThreads({
        mailboxId,
        status,
        unreadOnly,
        search,
        clientId,
        leadId,
        limit,
      }),
      countUnreadMailThreads(mailboxId),
    ]);

    return NextResponse.json({ threads, unreadCount });
  } catch (error) {
    console.error("[api/admin/mail/threads] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

/** Nouveau message SMTP + création de conversation. Permission mail.write. */
export async function POST(request: Request) {
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
    const body = await request.json();
    const parsed = composeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }

    const session = await getAdminSession();
    const result = await composeNewMail({
      mailboxId: parsed.data.mailboxId,
      to: splitAddresses(parsed.data.to),
      cc: splitAddresses(parsed.data.cc),
      subject: parsed.data.subject,
      bodyText: parsed.data.bodyText,
      bodyHtml: parsed.data.bodyHtml,
      includeSignature: parsed.data.includeSignature,
    });

    await auditCrmAction({
      action: "compose",
      entityType: "mail_thread",
      entityId: result.thread.id,
      summary: `Nouveau message → ${result.to.join(", ")}`,
      metadata: {
        messageId: result.message.id,
        smtpMessageId: result.smtpMessageId,
        to: result.to,
        subject: result.thread.subject,
        actor: session?.email ?? session?.name ?? null,
      },
    });

    return NextResponse.json({
      thread: result.thread,
      message: result.message,
      to: result.to,
    });
  } catch (error) {
    const message = sanitizeMailError(error, "Échec de l’envoi.");
    console.error("[api/admin/mail/threads] POST", message);
    const status =
      message.includes("vide") ||
      message.includes("destinataire") ||
      message.includes("invalide") ||
      message.includes("Sujet")
        ? 400
        : message.includes("inactive") || message.includes("credentials")
          ? 422
          : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
