import { randomUUID } from "node:crypto";
import { decryptMailboxCredentials } from "@/lib/mail/crypto";
import { getMailSmtpHost, getMailSmtpPort } from "@/lib/mail/config";
import {
  appendSignature,
  buildMailSignature,
} from "@/lib/mail/signature";
import { sendMailViaSmtp } from "@/lib/mail/smtp-client";
import {
  allocateOutboundUid,
  createMailThread,
  getMailboxById,
  getMailThreadById,
  insertMailAttachments,
  insertMailMessage,
} from "@/lib/mail/repository";
import {
  extractEmailAddress,
  snippetFromBody,
  uniqueEmails,
} from "@/lib/mail/threading";
import type { CrmMailMessage, CrmMailThread } from "@/lib/mail/types";
import { isS3Configured, sanitizeFilename, uploadObjectBuffer } from "@/lib/s3";

export type MailOutgoingAttachment = {
  filename: string;
  contentType: string;
  contentBase64: string;
};

export type ComposeMailInput = {
  mailboxId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  includeSignature?: boolean;
  attachments?: MailOutgoingAttachment[];
};

export type ComposeMailResult = {
  thread: CrmMailThread;
  message: Omit<CrmMailMessage, "rawHeaders">;
  smtpMessageId: string;
  to: string[];
};

const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 8 * 1024 * 1024;

export function parseRecipients(raw: string[]): string[] {
  const emails = uniqueEmails(raw.map((v) => v.trim()).filter(Boolean));
  if (emails.length === 0) {
    throw new Error("Indiquez au moins un destinataire valide.");
  }
  for (const email of emails) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`Adresse invalide : ${email}`);
    }
  }
  return emails;
}

export function decodeOutgoingAttachments(
  attachments: MailOutgoingAttachment[] | undefined,
): Array<{ filename: string; contentType: string; content: Buffer }> {
  if (!attachments?.length) return [];
  let total = 0;
  const decoded: Array<{ filename: string; contentType: string; content: Buffer }> = [];
  for (const att of attachments) {
    const filename = sanitizeFilename(att.filename || "piece-jointe");
    const contentType = (att.contentType || "application/octet-stream").slice(0, 160);
    const content = Buffer.from(att.contentBase64, "base64");
    if (!content.length) {
      throw new Error(`Pièce jointe vide : ${filename}`);
    }
    if (content.length > MAX_ATTACHMENT_BYTES) {
      throw new Error(`Pièce jointe trop lourde (max 4 Mo) : ${filename}`);
    }
    total += content.length;
    if (total > MAX_TOTAL_ATTACHMENT_BYTES) {
      throw new Error("Pièces jointes trop lourdes (max 8 Mo au total).");
    }
    decoded.push({ filename, contentType, content });
  }
  return decoded;
}

async function persistOutboundAttachments(
  messageId: string,
  mailboxId: string,
  attachments: Array<{ filename: string; contentType: string; content: Buffer }>,
): Promise<void> {
  if (attachments.length === 0) return;

  const meta: Array<{
    filename: string;
    contentType: string;
    sizeBytes: number;
    s3Key?: string | null;
  }> = [];

  for (const att of attachments) {
    let s3Key: string | null = null;
    if (isS3Configured()) {
      s3Key = `mail/${mailboxId}/${messageId}/${randomUUID()}-${att.filename}`;
      await uploadObjectBuffer(s3Key, att.content, att.contentType);
    }
    meta.push({
      filename: att.filename,
      contentType: att.contentType,
      sizeBytes: att.content.length,
      s3Key,
    });
  }

  await insertMailAttachments(messageId, meta);
}

/**
 * Crée une conversation sortante, envoie via SMTP Hostinger, enregistre en base.
 */
export async function composeNewMail(
  input: ComposeMailInput,
): Promise<ComposeMailResult> {
  const bodyText = input.bodyText?.trim() ?? "";
  if (!bodyText && !input.bodyHtml?.trim()) {
    throw new Error("Le corps du message est vide.");
  }
  if (bodyText.length > 100_000) {
    throw new Error("Message trop long (max 100 000 caractères).");
  }

  const subject = input.subject?.trim() || "(sans objet)";
  if (subject.length > 500) {
    throw new Error("Sujet trop long (max 500 caractères).");
  }

  const to = parseRecipients(input.to);
  const cc = input.cc?.length ? parseRecipients(input.cc) : [];
  const bcc = input.bcc?.length ? parseRecipients(input.bcc) : [];
  const fileAttachments = decodeOutgoingAttachments(input.attachments);

  const mailbox = await getMailboxById(input.mailboxId, {
    includeCredentials: true,
  });
  if (!mailbox?.active || !mailbox.credentialsEncrypted) {
    throw new Error("Boîte messagerie inactive ou credentials manquants.");
  }

  const our = extractEmailAddress(mailbox.email);
  if (to.includes(our) && to.length === 1 && cc.length === 0 && bcc.length === 0) {
    throw new Error("Choisissez un destinataire autre que votre propre boîte.");
  }

  const signature = await buildMailSignature();
  const includeSignature = input.includeSignature !== false;
  const composed = appendSignature(
    bodyText || (input.bodyHtml ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    input.bodyHtml,
    signature,
    includeSignature,
  );

  const domain = mailbox.email.split("@")[1] || "sdcreativ.com";
  const outboundMessageId = `<crm-${randomUUID()}@${domain}>`;

  const credentials = decryptMailboxCredentials(mailbox.credentialsEncrypted);
  const smtp = await sendMailViaSmtp({
    credentials,
    host: mailbox.smtpHost || getMailSmtpHost(),
    port: mailbox.smtpPort || getMailSmtpPort(),
    fromName: mailbox.displayName,
    to,
    cc: cc.length ? cc : undefined,
    bcc: bcc.length ? bcc : undefined,
    subject,
    text: composed.text,
    html: composed.html,
    messageId: outboundMessageId,
    attachments: fileAttachments,
  });

  const receivedAt = new Date();
  const participants = uniqueEmails([mailbox.email, ...to, ...cc]);
  const threadId = await createMailThread({
    mailboxId: mailbox.id,
    subject,
    snippet: snippetFromBody(bodyText || composed.text),
    participants,
    lastMessageAt: receivedAt,
    unreadCount: 0,
  });

  const uid = await allocateOutboundUid(mailbox.id);
  const saved = await insertMailMessage({
    threadId,
    mailboxId: mailbox.id,
    messageId: smtp.messageId || outboundMessageId,
    inReplyTo: null,
    uid,
    folder: "CRM-OUT",
    fromAddress: mailbox.email,
    toAddresses: to,
    ccAddresses: cc,
    subject,
    bodyText: composed.text,
    bodyHtml: composed.html,
    receivedAt,
    direction: "outbound",
  });

  await persistOutboundAttachments(saved.id, mailbox.id, fileAttachments);

  const thread = await getMailThreadById(threadId);
  if (!thread) {
    throw new Error("Conversation créée introuvable.");
  }

  return {
    thread,
    smtpMessageId: smtp.messageId,
    to,
    message: {
      id: saved.id,
      threadId,
      mailboxId: mailbox.id,
      messageId: smtp.messageId || outboundMessageId,
      inReplyTo: null,
      uid,
      folder: "CRM-OUT",
      fromAddress: mailbox.email,
      toAddresses: to,
      ccAddresses: cc,
      subject,
      bodyText: composed.text,
      bodyHtml: composed.html,
      receivedAt: receivedAt.toISOString(),
      direction: "outbound",
      createdAt: receivedAt.toISOString(),
    },
  };
}
