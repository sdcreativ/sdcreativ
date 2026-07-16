import { decryptMailboxCredentials } from "@/lib/mail/crypto";
import {
  getMailImapHost,
  getMailImapPort,
  HOSTINGER_MAIL_LIMITS,
  isMailCredentialsSecretConfigured,
  isMailSyncEnabled,
} from "@/lib/mail/config";
import { fetchMessagesSinceUid } from "@/lib/mail/imap-client";
import { sanitizeMailError } from "@/lib/mail/sanitize-error";
import { tryAutoLinkMailThread } from "@/lib/mail/link";
import {
  createMailThread,
  findMessageIdByHeader,
  findThreadBySubjectFallback,
  getMailboxByEmail,
  getMailboxById,
  insertMailAttachments,
  insertMailMessage,
  listActiveMailboxes,
  markMailboxSyncError,
  markMailboxSyncSuccess,
  touchMailThread,
} from "@/lib/mail/repository";
import {
  normalizeMailSubject,
  snippetFromBody,
  uniqueEmails,
} from "@/lib/mail/threading";
import type { CrmMailbox } from "@/lib/mail/types";

export type MailboxSyncResult = {
  mailboxId: string;
  email: string;
  fetched: number;
  inserted: number;
  skipped: number;
  lastUid: number;
  error?: string;
};

export type MailSyncRunResult = {
  enabled: boolean;
  mailboxes: number;
  results: MailboxSyncResult[];
};

async function resolveThreadId(input: {
  mailboxId: string;
  inReplyTo: string | null;
  references: string[];
  subject: string;
  participants: string[];
}): Promise<string | null> {
  const candidates = [
    ...(input.inReplyTo ? [input.inReplyTo] : []),
    ...input.references,
  ];

  for (const headerId of candidates) {
    const found = await findMessageIdByHeader(input.mailboxId, headerId);
    if (found) return found.threadId;
  }

  return findThreadBySubjectFallback({
    mailboxId: input.mailboxId,
    normalizedSubject: normalizeMailSubject(input.subject),
    participantEmails: input.participants,
  });
}

export async function syncMailbox(
  mailbox: CrmMailbox,
  options?: { limit?: number },
): Promise<MailboxSyncResult> {
  if (!mailbox.credentialsEncrypted) {
    const err = "Credentials chiffrés absents pour cette boîte.";
    await markMailboxSyncError(mailbox.id, err);
    return {
      mailboxId: mailbox.id,
      email: mailbox.email,
      fetched: 0,
      inserted: 0,
      skipped: 0,
      lastUid: mailbox.lastUid,
      error: err,
    };
  }

  try {
    const credentials = decryptMailboxCredentials(mailbox.credentialsEncrypted);
    const fetched = await fetchMessagesSinceUid({
      credentials,
      host: mailbox.imapHost || getMailImapHost(),
      port: mailbox.imapPort || getMailImapPort(),
      sinceUid: mailbox.lastUid,
      limit: options?.limit ?? 50,
    });

    let inserted = 0;
    let skipped = 0;
    let maxUid = mailbox.lastUid;

    for (const msg of fetched) {
      maxUid = Math.max(maxUid, msg.uid);
      const participants = uniqueEmails([
        msg.fromAddress,
        ...msg.toAddresses,
        ...msg.ccAddresses,
      ]);

      let threadId = await resolveThreadId({
        mailboxId: mailbox.id,
        inReplyTo: msg.inReplyTo,
        references: msg.references,
        subject: msg.subject,
        participants,
      });

      const snippet = snippetFromBody(msg.bodyText || msg.subject);

      if (!threadId) {
        threadId = await createMailThread({
          mailboxId: mailbox.id,
          subject: msg.subject,
          snippet,
          participants,
          lastMessageAt: msg.receivedAt,
        });
      } else {
        await touchMailThread({
          threadId,
          snippet,
          participants,
          lastMessageAt: msg.receivedAt,
          incrementUnread: true,
        });
      }

      await tryAutoLinkMailThread({
        threadId,
        fromAddress: msg.fromAddress,
        participants,
      });

      const saved = await insertMailMessage({
        threadId,
        mailboxId: mailbox.id,
        messageId: msg.messageId,
        inReplyTo: msg.inReplyTo,
        uid: msg.uid,
        folder: msg.folder,
        fromAddress: msg.fromAddress,
        toAddresses: msg.toAddresses,
        ccAddresses: msg.ccAddresses,
        subject: msg.subject,
        bodyText: msg.bodyText,
        bodyHtml: msg.bodyHtml,
        receivedAt: msg.receivedAt,
        direction: "inbound",
      });

      if (saved.inserted) {
        inserted += 1;
        if (msg.attachments.length > 0) {
          await insertMailAttachments(saved.id, msg.attachments);
        }
      } else {
        skipped += 1;
      }
    }

    await markMailboxSyncSuccess(mailbox.id, maxUid);

    return {
      mailboxId: mailbox.id,
      email: mailbox.email,
      fetched: fetched.length,
      inserted,
      skipped,
      lastUid: maxUid,
    };
  } catch (error) {
    const message = sanitizeMailError(error, "Erreur sync IMAP inconnue.");
    console.error(`[mail/sync] ${mailbox.email}`, message);
    await markMailboxSyncError(mailbox.id, message);
    return {
      mailboxId: mailbox.id,
      email: mailbox.email,
      fetched: 0,
      inserted: 0,
      skipped: 0,
      lastUid: mailbox.lastUid,
      error: message,
    };
  }
}

export async function syncMailboxById(
  mailboxId: string,
  options?: { limit?: number },
): Promise<MailboxSyncResult> {
  const mailbox = await getMailboxById(mailboxId, { includeCredentials: true });
  if (!mailbox || !mailbox.active) {
    return {
      mailboxId,
      email: "",
      fetched: 0,
      inserted: 0,
      skipped: 0,
      lastUid: 0,
      error: "Boîte introuvable ou inactive.",
    };
  }
  return syncMailbox(mailbox, options);
}

export async function syncMailboxByEmail(
  email: string,
  options?: { limit?: number },
): Promise<MailboxSyncResult> {
  const mailbox = await getMailboxByEmail(email, { includeCredentials: true });
  if (!mailbox || !mailbox.active) {
    return {
      mailboxId: "",
      email: email.trim().toLowerCase(),
      fetched: 0,
      inserted: 0,
      skipped: 0,
      lastUid: 0,
      error: "Boîte introuvable ou inactive.",
    };
  }
  return syncMailbox(mailbox, options);
}

/**
 * Sync séquentielle (1 connexion IMAP à la fois — limite Hostinger).
 */
export async function syncAllActiveMailboxes(options?: {
  limit?: number;
  force?: boolean;
}): Promise<MailSyncRunResult> {
  if (!options?.force && !isMailSyncEnabled()) {
    return { enabled: false, mailboxes: 0, results: [] };
  }
  if (!isMailCredentialsSecretConfigured()) {
    throw new Error("MAIL_CREDENTIALS_SECRET manquant — impossible de déchiffrer les boîtes.");
  }

  const mailboxes = await listActiveMailboxes({ includeCredentials: true });
  const results: MailboxSyncResult[] = [];

  // Séquentiel volontairement (maxConcurrentImapConnections = 1)
  // Phase 4 : N boîtes actives, une connexion IMAP à la fois.
  const maxConcurrent = HOSTINGER_MAIL_LIMITS.maxConcurrentImapConnections;
  if (maxConcurrent !== 1) {
    console.warn(
      `[mail/sync] maxConcurrentImapConnections=${maxConcurrent} — sync reste séquentielle.`,
    );
  }

  for (const mailbox of mailboxes) {
    results.push(await syncMailbox(mailbox, { limit: options?.limit }));
  }

  return {
    enabled: true,
    mailboxes: mailboxes.length,
    results,
  };
}
