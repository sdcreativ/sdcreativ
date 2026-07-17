import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail, type Attachment } from "mailparser";
import {
  getMailImapHost,
  getMailImapPort,
} from "@/lib/mail/config";
import type { MailboxCredentials } from "@/lib/mail/crypto";
import { sanitizeMailError } from "@/lib/mail/sanitize-error";
import {
  extractEmailAddress,
  parseMessageIdList,
  uniqueEmails,
} from "@/lib/mail/threading";

export type FetchedMailAttachment = {
  filename: string;
  contentType: string;
  sizeBytes: number;
  /** Contenu binaire si disponible (sync / téléchargement à la demande). */
  content?: Buffer;
};

export type FetchedMailMessage = {
  uid: number;
  folder: string;
  messageId: string;
  inReplyTo: string | null;
  references: string[];
  fromAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  receivedAt: Date;
  attachments: FetchedMailAttachment[];
};

function addressList(
  value: ParsedMail["to"] | ParsedMail["from"] | ParsedMail["cc"],
): string[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  const emails: string[] = [];
  for (const entry of list) {
    for (const addr of entry.value ?? []) {
      if (addr.address) emails.push(addr.address);
    }
  }
  return uniqueEmails(emails);
}

function mapAttachments(
  attachments: Attachment[] | undefined,
  options?: { includeContent?: boolean },
): FetchedMailAttachment[] {
  if (!attachments?.length) return [];
  return attachments
    .filter((att) => Boolean(att.filename || att.contentType))
    .map((att) => ({
      filename: (att.filename || "attachment").slice(0, 260),
      contentType: (att.contentType || "application/octet-stream").slice(0, 160),
      sizeBytes: att.size ?? (att.content ? Buffer.byteLength(att.content) : 0),
      ...(options?.includeContent && att.content
        ? { content: Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content) }
        : {}),
    }));
}

export function createImapClient(credentials: MailboxCredentials, options?: {
  host?: string;
  port?: number;
}): ImapFlow {
  return new ImapFlow({
    host: options?.host ?? getMailImapHost(),
    port: options?.port ?? getMailImapPort(),
    secure: true,
    auth: {
      user: credentials.email,
      pass: credentials.password,
    },
    logger: false,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 60_000,
  });
}

/**
 * Import incrémental par UID IMAP (pas par numéro de séquence).
 * Corrige le « Command failed » Hostinger sur plages invalides.
 */
export async function fetchMessagesSinceUid(input: {
  credentials: MailboxCredentials;
  host?: string;
  port?: number;
  folder?: string;
  /** Dernier UID déjà synchronisé (exclus). */
  sinceUid: number;
  /** Plafond de messages par run. */
  limit?: number;
}): Promise<FetchedMailMessage[]> {
  const folder = input.folder ?? "INBOX";
  const limit = input.limit ?? 50;
  const client = createImapClient(input.credentials, {
    host: input.host,
    port: input.port,
  });

  const results: FetchedMailMessage[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      if (!client.mailbox || client.mailbox.exists === 0) {
        return [];
      }

      const uidNext = Number(client.mailbox.uidNext ?? 0);
      // Plus rien à récupérer après sinceUid
      if (input.sinceUid > 0 && uidNext > 0 && input.sinceUid + 1 >= uidNext) {
        return [];
      }

      const range =
        input.sinceUid > 0 ? `${input.sinceUid + 1}:*` : "1:*";

      let count = 0;
      // 3e argument { uid: true } : la plage est en UIDs, pas en numéros de séquence
      for await (const msg of client.fetch(
        range,
        {
          uid: true,
          envelope: true,
          source: true,
          internalDate: true,
        },
        { uid: true },
      )) {
        if (!msg.uid || msg.uid <= input.sinceUid) continue;
        if (!msg.source) continue;

        const parsed = await simpleParser(msg.source);
        const messageId =
          parsed.messageId?.trim() ||
          `<uid-${msg.uid}@${extractEmailAddress(input.credentials.email)}>`;

        const fromAddress =
          addressList(parsed.from)[0] ??
          extractEmailAddress(parsed.from?.text ?? "unknown@invalid");

        results.push({
          uid: msg.uid,
          folder,
          messageId,
          inReplyTo: parsed.inReplyTo?.trim() || null,
          references: parseMessageIdList(
            typeof parsed.references === "string"
              ? parsed.references
              : Array.isArray(parsed.references)
                ? parsed.references.join(" ")
                : null,
          ),
          fromAddress,
          toAddresses: addressList(parsed.to),
          ccAddresses: addressList(parsed.cc),
          subject: (parsed.subject ?? msg.envelope?.subject ?? "(sans objet)").slice(0, 500),
          bodyText: (parsed.text ?? "").slice(0, 200_000),
          bodyHtml: parsed.html ? String(parsed.html).slice(0, 500_000) : null,
          receivedAt:
            parsed.date ??
            (msg.internalDate instanceof Date ? msg.internalDate : new Date()),
          attachments: mapAttachments(parsed.attachments, { includeContent: true }),
        });

        count += 1;
        if (count >= limit) break;
      }
    } finally {
      lock.release();
    }
  } catch (error) {
    throw new Error(sanitizeMailError(error, "Échec sync IMAP."));
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }

  results.sort((a, b) => a.uid - b.uid);
  return results;
}

/** Télécharge une pièce jointe depuis IMAP (UID + nom de fichier). */
export async function fetchImapAttachment(input: {
  credentials: MailboxCredentials;
  host?: string;
  port?: number;
  folder: string;
  uid: number;
  filename: string;
}): Promise<{ content: Buffer; contentType: string; filename: string }> {
  const client = createImapClient(input.credentials, {
    host: input.host,
    port: input.port,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock(input.folder || "INBOX");
    try {
      const msg = await client.fetchOne(
        String(input.uid),
        { source: true, uid: true },
        { uid: true },
      );
      if (!msg || !("source" in msg) || !msg.source) {
        throw new Error("Message IMAP introuvable pour cette pièce jointe.");
      }
      const parsed = await simpleParser(msg.source);
      const wanted = input.filename.toLowerCase();
      const att = (parsed.attachments ?? []).find(
        (a) => (a.filename || "attachment").toLowerCase() === wanted,
      );
      if (!att?.content) {
        throw new Error("Pièce jointe introuvable sur le serveur mail.");
      }
      const content = Buffer.isBuffer(att.content)
        ? att.content
        : Buffer.from(att.content);
      return {
        content,
        contentType: att.contentType || "application/octet-stream",
        filename: att.filename || input.filename,
      };
    } finally {
      lock.release();
    }
  } catch (error) {
    throw new Error(sanitizeMailError(error, "Échec téléchargement pièce jointe."));
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }
}
