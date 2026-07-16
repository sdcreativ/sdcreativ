import { randomUUID } from "node:crypto";
import { decryptMailboxCredentials } from "@/lib/mail/crypto";
import { getMailSmtpHost, getMailSmtpPort } from "@/lib/mail/config";
import {
  appendSignature,
  buildMailSignature,
} from "@/lib/mail/signature";
import { sendMailViaSmtp } from "@/lib/mail/smtp-client";
import {
  decodeOutgoingAttachments,
  type MailOutgoingAttachment,
} from "@/lib/mail/compose";
import {
  allocateOutboundUid,
  createMailThread,
  deleteMailDraft,
  getMailboxById,
  getMailThreadById,
  insertMailAttachments,
  insertMailMessage,
  listMailMessagesByThreadId,
  touchMailThread,
} from "@/lib/mail/repository";
import {
  extractEmailAddress,
  snippetFromBody,
  uniqueEmails,
} from "@/lib/mail/threading";
import type { CrmMailMessage, CrmMailThread } from "@/lib/mail/types";
import { isS3Configured, sanitizeFilename, uploadObjectBuffer } from "@/lib/s3";

export type ReplyMailMode = "reply" | "replyAll" | "forward";

export type ReplyMailInput = {
  threadId: string;
  bodyText: string;
  bodyHtml?: string | null;
  includeSignature?: boolean;
  userId?: string;
  mode?: ReplyMailMode;
  /** Destinataires forcés (ex. forward édité). */
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  attachments?: MailOutgoingAttachment[];
};

export type ReplyMailResult = {
  message: Omit<CrmMailMessage, "rawHeaders">;
  thread?: CrmMailThread;
  smtpMessageId: string;
  to: string[];
  cc: string[];
};

function replySubject(subject: string): string {
  const trimmed = subject.trim() || "(sans objet)";
  if (/^(re|fw|fwd|tr|aw)\s*:/i.test(trimmed)) return trimmed;
  return `Re: ${trimmed}`;
}

function forwardSubject(subject: string): string {
  const trimmed = subject.trim() || "(sans objet)";
  if (/^(fw|fwd|tr)\s*:/i.test(trimmed)) return trimmed;
  return `Fw: ${trimmed}`;
}

function resolveReplyTo(
  messages: CrmMailMessage[],
  mailboxEmail: string,
  participants: string[],
): string[] {
  const our = mailboxEmail.toLowerCase();

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i]!;
    if (msg.direction === "inbound") {
      const from = extractEmailAddress(msg.fromAddress);
      if (from && from !== our) return [from];
    }
  }

  const others = uniqueEmails(participants).filter((e) => e !== our);
  if (others.length > 0) return [others[0]!];
  throw new Error("Aucun destinataire trouvé pour cette conversation.");
}

function resolveReplyAll(
  messages: CrmMailMessage[],
  mailboxEmail: string,
  participants: string[],
): { to: string[]; cc: string[] } {
  const our = mailboxEmail.toLowerCase();
  const to = resolveReplyTo(messages, mailboxEmail, participants);
  const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");
  const cc = uniqueEmails([
    ...(lastInbound?.toAddresses ?? []),
    ...(lastInbound?.ccAddresses ?? []),
    ...participants,
  ]).filter((e) => e !== our && !to.includes(e));
  return { to, cc };
}

function buildReferences(messages: CrmMailMessage[], inReplyTo: string | null): string[] {
  const ids: string[] = [];
  for (const msg of messages) {
    if (msg.messageId) ids.push(msg.messageId);
  }
  if (inReplyTo && !ids.includes(inReplyTo)) ids.push(inReplyTo);
  return [...new Set(ids)].slice(-20);
}

function quoteForwardBody(messages: CrmMailMessage[]): { text: string; html: string } {
  const last = [...messages].reverse()[0];
  if (!last) return { text: "", html: "" };
  const header = `---------- Message transféré ----------\nDe : ${last.fromAddress}\nDate : ${last.receivedAt}\nObjet : ${last.subject}\n\n`;
  const text = `${header}${last.bodyText || ""}`;
  const htmlBody =
    last.bodyHtml ||
    `<pre style="white-space:pre-wrap;font-family:inherit">${(last.bodyText || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</pre>`;
  return {
    text,
    html: `<blockquote style="border-left:3px solid #cbd5e1;margin:12px 0;padding-left:12px;color:#475569">${htmlBody}</blockquote>`,
  };
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
      s3Key = `mail/${mailboxId}/${messageId}/${randomUUID()}-${sanitizeFilename(att.filename)}`;
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
 * Envoie une réponse / réponse à tous / transfert via SMTP Hostinger.
 */
export async function replyToMailThread(
  input: ReplyMailInput,
): Promise<ReplyMailResult> {
  const mode = input.mode ?? "reply";
  const bodyText = input.bodyText?.trim() ?? "";
  if (!bodyText && !input.bodyHtml?.trim() && mode !== "forward") {
    throw new Error("Le corps du message est vide.");
  }
  if (bodyText.length > 100_000) {
    throw new Error("Message trop long (max 100 000 caractères).");
  }

  const thread = await getMailThreadById(input.threadId);
  if (!thread) {
    throw new Error("Conversation introuvable.");
  }

  const mailbox = await getMailboxById(thread.mailboxId, {
    includeCredentials: true,
  });
  if (!mailbox?.active || !mailbox.credentialsEncrypted) {
    throw new Error("Boîte messagerie inactive ou credentials manquants.");
  }

  const messages = await listMailMessagesByThreadId(thread.id);
  const fileAttachments = decodeOutgoingAttachments(input.attachments);

  let to: string[];
  let cc: string[] = [];
  let bcc: string[] = [];
  let subject: string;
  let inReplyTo: string | null = null;
  let references: string[] = [];
  let threadId = thread.id;
  let isNewThread = false;

  if (mode === "forward") {
    if (!input.to?.length) {
      throw new Error("Indiquez un destinataire pour le transfert.");
    }
    to = uniqueEmails(input.to);
    cc = input.cc?.length ? uniqueEmails(input.cc) : [];
    bcc = input.bcc?.length ? uniqueEmails(input.bcc) : [];
    subject = input.subject?.trim() || forwardSubject(thread.subject);
    const quoted = quoteForwardBody(messages);
    const userText = bodyText || "Voir message transféré.";
    const combinedText = `${userText}\n\n${quoted.text}`;
    const combinedHtml = input.bodyHtml
      ? `${input.bodyHtml}${quoted.html}`
      : `<p>${userText.replace(/\n/g, "<br/>")}</p>${quoted.html}`;

    const signature = await buildMailSignature();
    const includeSignature = input.includeSignature !== false;
    const composed = appendSignature(
      combinedText,
      combinedHtml,
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
    threadId = await createMailThread({
      mailboxId: mailbox.id,
      subject,
      snippet: snippetFromBody(userText),
      participants: uniqueEmails([mailbox.email, ...to, ...cc]),
      lastMessageAt: receivedAt,
      unreadCount: 0,
      clientId: thread.clientId,
      leadId: thread.leadId,
    });
    isNewThread = true;

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

    const newThread = await getMailThreadById(threadId);

    return {
      smtpMessageId: smtp.messageId,
      to,
      cc,
      thread: newThread ?? undefined,
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

  if (mode === "replyAll") {
    const resolved = resolveReplyAll(messages, mailbox.email, thread.participants);
    to = input.to?.length ? uniqueEmails(input.to) : resolved.to;
    cc = input.cc?.length ? uniqueEmails(input.cc) : resolved.cc;
  } else {
    to = input.to?.length
      ? uniqueEmails(input.to)
      : resolveReplyTo(messages, mailbox.email, thread.participants);
    cc = input.cc?.length ? uniqueEmails(input.cc) : [];
  }
  bcc = input.bcc?.length ? uniqueEmails(input.bcc) : [];
  subject = input.subject?.trim() || replySubject(thread.subject);

  const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");
  const lastAny = messages[messages.length - 1] ?? null;
  inReplyTo = lastInbound?.messageId ?? lastAny?.messageId ?? null;
  references = buildReferences(messages, inReplyTo);

  const signature = await buildMailSignature();
  const includeSignature = input.includeSignature !== false;
  const composed = appendSignature(
    bodyText,
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
    inReplyTo,
    references,
    messageId: outboundMessageId,
    attachments: fileAttachments,
  });

  const uid = await allocateOutboundUid(mailbox.id);
  const receivedAt = new Date();
  const saved = await insertMailMessage({
    threadId,
    mailboxId: mailbox.id,
    messageId: smtp.messageId || outboundMessageId,
    inReplyTo,
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

  await touchMailThread({
    threadId,
    snippet: snippetFromBody(bodyText),
    participants: uniqueEmails([...thread.participants, ...to, ...cc, mailbox.email]),
    lastMessageAt: receivedAt,
    incrementUnread: false,
  });

  if (input.userId && !isNewThread) {
    await deleteMailDraft(thread.id, input.userId);
  }

  return {
    smtpMessageId: smtp.messageId,
    to,
    cc,
    message: {
      id: saved.id,
      threadId,
      mailboxId: mailbox.id,
      messageId: smtp.messageId || outboundMessageId,
      inReplyTo,
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
