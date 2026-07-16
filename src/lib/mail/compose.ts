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
  insertMailMessage,
} from "@/lib/mail/repository";
import {
  extractEmailAddress,
  snippetFromBody,
  uniqueEmails,
} from "@/lib/mail/threading";
import type { CrmMailMessage, CrmMailThread } from "@/lib/mail/types";

export type ComposeMailInput = {
  mailboxId: string;
  to: string[];
  cc?: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  includeSignature?: boolean;
};

export type ComposeMailResult = {
  thread: CrmMailThread;
  message: Omit<CrmMailMessage, "rawHeaders">;
  smtpMessageId: string;
  to: string[];
};

function parseRecipients(raw: string[]): string[] {
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

/**
 * Crée une conversation sortante, envoie via SMTP Hostinger, enregistre en base.
 */
export async function composeNewMail(
  input: ComposeMailInput,
): Promise<ComposeMailResult> {
  const bodyText = input.bodyText?.trim() ?? "";
  if (!bodyText) {
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

  const mailbox = await getMailboxById(input.mailboxId, {
    includeCredentials: true,
  });
  if (!mailbox?.active || !mailbox.credentialsEncrypted) {
    throw new Error("Boîte messagerie inactive ou credentials manquants.");
  }

  const our = extractEmailAddress(mailbox.email);
  if (to.includes(our) && to.length === 1 && cc.length === 0) {
    throw new Error("Choisissez un destinataire autre que votre propre boîte.");
  }

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
    subject,
    text: composed.text,
    html: composed.html,
    messageId: outboundMessageId,
  });

  const receivedAt = new Date();
  const participants = uniqueEmails([mailbox.email, ...to, ...cc]);
  const threadId = await createMailThread({
    mailboxId: mailbox.id,
    subject,
    snippet: snippetFromBody(bodyText),
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
