import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail, type Attachment } from "mailparser";
import {
  getMailImapHost,
  getMailImapPort,
} from "@/lib/mail/config";
import type { MailboxCredentials } from "@/lib/mail/crypto";
import {
  extractEmailAddress,
  parseMessageIdList,
  uniqueEmails,
} from "@/lib/mail/threading";

export type FetchedMailAttachment = {
  filename: string;
  contentType: string;
  sizeBytes: number;
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

function mapAttachments(attachments: Attachment[] | undefined): FetchedMailAttachment[] {
  if (!attachments?.length) return [];
  return attachments
    .filter((att) => Boolean(att.filename || att.contentType))
    .map((att) => ({
      filename: (att.filename || "attachment").slice(0, 260),
      contentType: (att.contentType || "application/octet-stream").slice(0, 160),
      sizeBytes: att.size ?? (att.content ? Buffer.byteLength(att.content) : 0),
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
      const range =
        input.sinceUid > 0 ? `${input.sinceUid + 1}:*` : "1:*";

      // exists === 0 → boîte vide
      if (!client.mailbox || client.mailbox.exists === 0) {
        return [];
      }

      let count = 0;
      for await (const msg of client.fetch(range, {
        uid: true,
        envelope: true,
        source: true,
        internalDate: true,
      })) {
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
          attachments: mapAttachments(parsed.attachments),
        });

        count += 1;
        if (count >= limit) break;
      }
    } finally {
      lock.release();
    }
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
