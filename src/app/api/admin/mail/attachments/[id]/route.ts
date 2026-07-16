import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { decryptMailboxCredentials } from "@/lib/mail/crypto";
import { getMailImapHost, getMailImapPort } from "@/lib/mail/config";
import { fetchImapAttachment } from "@/lib/mail/imap-client";
import {
  getMailAttachmentDownloadContext,
  getMailboxById,
} from "@/lib/mail/repository";
import { sanitizeMailError } from "@/lib/mail/sanitize-error";
import { downloadObjectBuffer, isS3Configured } from "@/lib/s3";

type RouteContext = { params: Promise<{ id: string }> };

/** Télécharge une pièce jointe (S3 si présent, sinon IMAP). */
export async function GET(_request: Request, context: RouteContext) {
  const authError = await requireAdminAuth({ permission: "mail.read" });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const ctx = await getMailAttachmentDownloadContext(id);
    if (!ctx) {
      return NextResponse.json({ error: "Pièce jointe introuvable." }, { status: 404 });
    }

    let content: Buffer;
    let contentType = ctx.attachment.contentType;

    if (ctx.attachment.s3Key && isS3Configured()) {
      content = await downloadObjectBuffer(ctx.attachment.s3Key);
    } else if (ctx.folder === "CRM-OUT") {
      return NextResponse.json(
        {
          error:
            "Contenu de la pièce jointe non stocké (envoyée sans S3). Réenvoyez avec stockage actif.",
        },
        { status: 404 },
      );
    } else {
      const mailbox = await getMailboxById(ctx.mailboxId, { includeCredentials: true });
      if (!mailbox?.credentialsEncrypted) {
        return NextResponse.json({ error: "Boîte inaccessible." }, { status: 422 });
      }
      const credentials = decryptMailboxCredentials(mailbox.credentialsEncrypted);
      const fetched = await fetchImapAttachment({
        credentials,
        host: mailbox.imapHost || getMailImapHost(),
        port: mailbox.imapPort || getMailImapPort(),
        folder: ctx.folder || "INBOX",
        uid: ctx.uid,
        filename: ctx.attachment.filename,
      });
      content = fetched.content;
      contentType = fetched.contentType;
    }

    return new NextResponse(new Uint8Array(content), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(ctx.attachment.filename)}"`,
        "Content-Length": String(content.length),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    const message = sanitizeMailError(error, "Téléchargement impossible.");
    console.error("[api/admin/mail/attachments/[id]] GET", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
