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
  deleteMailDraft,
  getMailboxById,
  getMailThreadById,
  insertMailMessage,
  listMailMessagesByThreadId,
  touchMailThread,
} from "@/lib/mail/repository";
import {
  extractEmailAddress,
  snippetFromBody,
  uniqueEmails,
} from "@/lib/mail/threading";
import type { CrmMailMessage } from "@/lib/mail/types";

export type ReplyMailInput = {
  threadId: string;
  bodyText: string;
  bodyHtml?: string | null;
  /** Inclure la signature branding (défaut true). */
  includeSignature?: boolean;
  /** Utilisateur CRM — pour supprimer son brouillon après envoi. */
  userId?: string;
};

export type ReplyMailResult = {
  message: Omit<CrmMailMessage, "rawHeaders">;
  smtpMessageId: string;
  to: string[];
};

function replySubject(subject: string): string {
  const trimmed = subject.trim() || "(sans objet)";
  if (/^(re|fw|fwd|tr|aw)\s*:/i.test(trimmed)) return trimmed;
  return `Re: ${trimmed}`;
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

function buildReferences(messages: CrmMailMessage[], inReplyTo: string | null): string[] {
  const ids: string[] = [];
  for (const msg of messages) {
    if (msg.messageId) ids.push(msg.messageId);
  }
  if (inReplyTo && !ids.includes(inReplyTo)) ids.push(inReplyTo);
  return [...new Set(ids)].slice(-20);
}

/**
 * Envoie une réponse SMTP Hostinger et enregistre le message outbound en base.
 */
export async function replyToMailThread(
  input: ReplyMailInput,
): Promise<ReplyMailResult> {
  const bodyText = input.bodyText?.trim() ?? "";
  if (!bodyText) {
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
  const to = resolveReplyTo(messages, mailbox.email, thread.participants);

  const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");
  const lastAny = messages[messages.length - 1] ?? null;
  const inReplyTo = lastInbound?.messageId ?? lastAny?.messageId ?? null;
  const references = buildReferences(messages, inReplyTo);

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
  const subject = replySubject(thread.subject);

  const credentials = decryptMailboxCredentials(mailbox.credentialsEncrypted);
  const smtp = await sendMailViaSmtp({
    credentials,
    host: mailbox.smtpHost || getMailSmtpHost(),
    port: mailbox.smtpPort || getMailSmtpPort(),
    fromName: mailbox.displayName,
    to,
    subject,
    text: composed.text,
    html: composed.html,
    inReplyTo,
    references,
    messageId: outboundMessageId,
  });

  const uid = await allocateOutboundUid(mailbox.id);
  const receivedAt = new Date();
  const saved = await insertMailMessage({
    threadId: thread.id,
    mailboxId: mailbox.id,
    messageId: smtp.messageId || outboundMessageId,
    inReplyTo,
    uid,
    folder: "CRM-OUT",
    fromAddress: mailbox.email,
    toAddresses: to,
    ccAddresses: [],
    subject,
    bodyText: composed.text,
    bodyHtml: composed.html,
    receivedAt,
    direction: "outbound",
  });

  await touchMailThread({
    threadId: thread.id,
    snippet: snippetFromBody(bodyText),
    participants: uniqueEmails([...thread.participants, ...to, mailbox.email]),
    lastMessageAt: receivedAt,
    incrementUnread: false,
  });

  if (input.userId) {
    await deleteMailDraft(thread.id, input.userId);
  }

  return {
    smtpMessageId: smtp.messageId,
    to,
    message: {
      id: saved.id,
      threadId: thread.id,
      mailboxId: mailbox.id,
      messageId: smtp.messageId || outboundMessageId,
      inReplyTo,
      uid,
      folder: "CRM-OUT",
      fromAddress: mailbox.email,
      toAddresses: to,
      ccAddresses: [],
      subject,
      bodyText: composed.text,
      bodyHtml: composed.html,
      receivedAt: receivedAt.toISOString(),
      direction: "outbound",
      createdAt: receivedAt.toISOString(),
    },
  };
}
