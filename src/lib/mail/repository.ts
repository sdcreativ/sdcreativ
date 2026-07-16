/**
 * Accès typé aux tables Messagerie (Phase 1.1).
 * La sync IMAP (Phase 1.2) s’appuiera sur ces mappers.
 */

import { withDb } from "@/lib/db";
import { MAIL_V1_SHARED_MAILBOX } from "@/lib/mail/config";
import { normalizeMailSubject } from "@/lib/mail/threading";
import type {
  CrmMailAttachment,
  CrmMailDraft,
  CrmMailMessage,
  CrmMailMessageDirection,
  CrmMailThread,
  CrmMailThreadStatus,
  CrmMailbox,
} from "@/lib/mail/types";

type MailboxRow = {
  id: string;
  email: string;
  display_name: string;
  imap_host: string;
  imap_port: number;
  smtp_host: string;
  smtp_port: number;
  credentials_encrypted: string;
  active: boolean;
  user_id: string | null;
  last_sync_at: Date | null;
  last_uid: string | number;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
};

type ThreadRow = {
  id: string;
  mailbox_id: string;
  subject: string;
  snippet: string;
  participants: unknown;
  last_message_at: Date | null;
  unread_count: number;
  client_id: string | null;
  lead_id: string | null;
  status: CrmMailThreadStatus;
  created_at: Date;
  updated_at: Date;
};

type MessageRow = {
  id: string;
  thread_id: string;
  mailbox_id: string;
  message_id: string;
  in_reply_to: string | null;
  uid: string | number;
  folder: string;
  from_address: string;
  to_addresses: unknown;
  cc_addresses: unknown;
  subject: string;
  body_text: string;
  body_html: string | null;
  received_at: Date;
  direction: CrmMailMessageDirection;
  raw_headers: unknown;
  created_at: Date;
};

type AttachmentRow = {
  id: string;
  message_id: string;
  filename: string;
  content_type: string;
  size_bytes: string | number;
  s3_key: string | null;
  created_at: Date;
};

type DraftRow = {
  id: string;
  thread_id: string;
  user_id: string;
  body_text: string;
  body_html: string | null;
  include_signature: boolean;
  created_at: Date;
  updated_at: Date;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function mapMailbox(row: MailboxRow, options?: { includeCredentials?: boolean }): CrmMailbox {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    imapHost: row.imap_host,
    imapPort: row.imap_port,
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    ...(options?.includeCredentials
      ? { credentialsEncrypted: row.credentials_encrypted }
      : {}),
    active: row.active,
    userId: row.user_id,
    lastSyncAt: row.last_sync_at?.toISOString() ?? null,
    lastUid: Number(row.last_uid ?? 0),
    lastError: row.last_error,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function mapThread(row: ThreadRow): CrmMailThread {
  return {
    id: row.id,
    mailboxId: row.mailbox_id,
    subject: row.subject,
    snippet: row.snippet,
    participants: asStringArray(row.participants),
    lastMessageAt: row.last_message_at?.toISOString() ?? null,
    unreadCount: row.unread_count,
    clientId: row.client_id,
    leadId: row.lead_id,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function mapMessage(row: MessageRow): CrmMailMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    mailboxId: row.mailbox_id,
    messageId: row.message_id,
    inReplyTo: row.in_reply_to,
    uid: Number(row.uid),
    folder: row.folder,
    fromAddress: row.from_address,
    toAddresses: asStringArray(row.to_addresses),
    ccAddresses: asStringArray(row.cc_addresses),
    subject: row.subject,
    bodyText: row.body_text,
    bodyHtml: row.body_html,
    receivedAt: row.received_at.toISOString(),
    direction: row.direction,
    rawHeaders: asRecord(row.raw_headers),
    createdAt: row.created_at.toISOString(),
  };
}

export function mapAttachment(row: AttachmentRow): CrmMailAttachment {
  return {
    id: row.id,
    messageId: row.message_id,
    filename: row.filename,
    contentType: row.content_type,
    sizeBytes: Number(row.size_bytes ?? 0),
    s3Key: row.s3_key,
    createdAt: row.created_at.toISOString(),
  };
}

export function mapDraft(row: DraftRow): CrmMailDraft {
  return {
    id: row.id,
    threadId: row.thread_id,
    userId: row.user_id,
    bodyText: row.body_text,
    bodyHtml: row.body_html,
    includeSignature: row.include_signature,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const MAILBOX_COLUMNS = `
  id, email, display_name, imap_host, imap_port, smtp_host, smtp_port,
  credentials_encrypted, active, user_id, last_sync_at, last_uid, last_error,
  created_at, updated_at
`;

const THREAD_COLUMNS = `
  id, mailbox_id, subject, snippet, participants, last_message_at,
  unread_count, client_id, lead_id, status, created_at, updated_at
`;

const MESSAGE_COLUMNS = `
  id, thread_id, mailbox_id, message_id, in_reply_to, uid, folder,
  from_address, to_addresses, cc_addresses, subject,
  body_text, body_html, received_at, direction, raw_headers, created_at
`;

const ATTACHMENT_COLUMNS = `
  id, message_id, filename, content_type, size_bytes, s3_key, created_at
`;

const DRAFT_COLUMNS = `
  id, thread_id, user_id, body_text, body_html, include_signature,
  created_at, updated_at
`;

/** Vérifie que les tables messagerie sont présentes (après ensureSchema). */
export async function mailSchemaReady(): Promise<boolean> {
  return withDb(async (query) => {
    const { rows } = await query<{ ok: boolean }>(
      `SELECT (
         to_regclass('public.crm_mailboxes') IS NOT NULL
         AND to_regclass('public.crm_mail_threads') IS NOT NULL
         AND to_regclass('public.crm_mail_messages') IS NOT NULL
         AND to_regclass('public.crm_mail_attachments') IS NOT NULL
         AND to_regclass('public.crm_mail_drafts') IS NOT NULL
       ) AS ok`,
    );
    return Boolean(rows[0]?.ok);
  });
}

export async function listMailboxes(options?: {
  includeCredentials?: boolean;
  activeOnly?: boolean;
}): Promise<CrmMailbox[]> {
  return withDb(async (query) => {
    const { rows } = await query<MailboxRow>(
      options?.activeOnly
        ? `SELECT ${MAILBOX_COLUMNS}
           FROM crm_mailboxes
           WHERE active = true
           ORDER BY email ASC`
        : `SELECT ${MAILBOX_COLUMNS}
           FROM crm_mailboxes
           ORDER BY email ASC`,
    );
    return rows.map((row) => mapMailbox(row, options));
  });
}

export async function listActiveMailboxes(options?: {
  includeCredentials?: boolean;
}): Promise<CrmMailbox[]> {
  return listMailboxes({ ...options, activeOnly: true });
}

export async function getMailboxByEmail(
  email: string,
  options?: { includeCredentials?: boolean },
): Promise<CrmMailbox | null> {
  return withDb(async (query) => {
    const { rows } = await query<MailboxRow>(
      `SELECT ${MAILBOX_COLUMNS}
       FROM crm_mailboxes
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email.trim()],
    );
    return rows[0] ? mapMailbox(rows[0], options) : null;
  });
}

export async function getMailboxById(
  id: string,
  options?: { includeCredentials?: boolean },
): Promise<CrmMailbox | null> {
  return withDb(async (query) => {
    const { rows } = await query<MailboxRow>(
      `SELECT ${MAILBOX_COLUMNS}
       FROM crm_mailboxes
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    return rows[0] ? mapMailbox(rows[0], options) : null;
  });
}

export async function upsertMailbox(input: {
  email: string;
  displayName?: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  credentialsEncrypted: string;
  active?: boolean;
  userId?: string | null;
}): Promise<CrmMailbox> {
  return withDb(async (query) => {
    const { rows } = await query<MailboxRow>(
      `INSERT INTO crm_mailboxes (
         email, display_name, imap_host, imap_port, smtp_host, smtp_port,
         credentials_encrypted, active, user_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (email) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         imap_host = EXCLUDED.imap_host,
         imap_port = EXCLUDED.imap_port,
         smtp_host = EXCLUDED.smtp_host,
         smtp_port = EXCLUDED.smtp_port,
         credentials_encrypted = EXCLUDED.credentials_encrypted,
         active = EXCLUDED.active,
         user_id = COALESCE(EXCLUDED.user_id, crm_mailboxes.user_id),
         last_error = NULL,
         updated_at = NOW()
       RETURNING ${MAILBOX_COLUMNS}`,
      [
        input.email.trim().toLowerCase(),
        input.displayName?.trim() || input.email.trim().toLowerCase(),
        input.imapHost,
        input.imapPort,
        input.smtpHost,
        input.smtpPort,
        input.credentialsEncrypted,
        input.active ?? true,
        input.userId ?? null,
      ],
    );
    return mapMailbox(rows[0]!, { includeCredentials: false });
  });
}

/** Boîtes visibles pour un utilisateur non-admin : partagée + la sienne. */
export async function listMailboxesVisibleToUser(input: {
  userId: string;
  userEmail: string;
  includeCredentials?: boolean;
}): Promise<CrmMailbox[]> {
  return withDb(async (query) => {
    const { rows } = await query<MailboxRow>(
      `SELECT ${MAILBOX_COLUMNS}
       FROM crm_mailboxes
       WHERE LOWER(email) = LOWER($1)
          OR user_id = $2::uuid
          OR LOWER(email) = LOWER($3)
       ORDER BY
         CASE WHEN LOWER(email) = LOWER($1) THEN 0 ELSE 1 END,
         email ASC`,
      [MAIL_V1_SHARED_MAILBOX, input.userId, input.userEmail],
    );
    return rows.map((row) => mapMailbox(row, input));
  });
}

export async function markMailboxSyncSuccess(
  mailboxId: string,
  lastUid: number,
): Promise<void> {
  await withDb(async (query) => {
    await query(
      `UPDATE crm_mailboxes SET
         last_sync_at = NOW(),
         last_uid = GREATEST(last_uid, $2),
         last_error = NULL,
         updated_at = NOW()
       WHERE id = $1`,
      [mailboxId, lastUid],
    );
  });
}

export async function markMailboxSyncError(
  mailboxId: string,
  errorMessage: string,
): Promise<void> {
  await withDb(async (query) => {
    await query(
      `UPDATE crm_mailboxes SET
         last_error = $2,
         updated_at = NOW()
       WHERE id = $1`,
      [mailboxId, errorMessage.slice(0, 1000)],
    );
  });
}

export async function findMessageIdByHeader(
  mailboxId: string,
  messageIdHeader: string,
): Promise<{ id: string; threadId: string } | null> {
  return withDb(async (query) => {
    const { rows } = await query<{ id: string; thread_id: string }>(
      `SELECT id, thread_id
       FROM crm_mail_messages
       WHERE mailbox_id = $1 AND message_id = $2
       LIMIT 1`,
      [mailboxId, messageIdHeader],
    );
    const row = rows[0];
    return row ? { id: row.id, threadId: row.thread_id } : null;
  });
}

export async function findThreadBySubjectFallback(input: {
  mailboxId: string;
  normalizedSubject: string;
  participantEmails: string[];
}): Promise<string | null> {
  if (!input.normalizedSubject) return null;
  return withDb(async (query) => {
    const { rows } = await query<{ id: string; subject: string; participants: unknown }>(
      `SELECT id, subject, participants
       FROM crm_mail_threads
       WHERE mailbox_id = $1
         AND status = 'open'
         AND last_message_at > NOW() - INTERVAL '60 days'
       ORDER BY last_message_at DESC NULLS LAST
       LIMIT 40`,
      [input.mailboxId],
    );

    for (const row of rows) {
      if (normalizeMailSubject(row.subject) !== input.normalizedSubject) continue;
      const participants = asStringArray(row.participants);
      const overlap = input.participantEmails.some((email) => participants.includes(email));
      if (overlap) return row.id;
    }
    return null;
  });
}

export async function createMailThread(input: {
  mailboxId: string;
  subject: string;
  snippet: string;
  participants: string[];
  lastMessageAt: Date;
  clientId?: string | null;
  leadId?: string | null;
}): Promise<string> {
  return withDb(async (query) => {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO crm_mail_threads (
         mailbox_id, subject, snippet, participants, last_message_at,
         unread_count, status, client_id, lead_id
       ) VALUES ($1, $2, $3, $4::jsonb, $5, 1, 'open', $6, $7)
       RETURNING id`,
      [
        input.mailboxId,
        input.subject.slice(0, 500),
        input.snippet,
        JSON.stringify(input.participants),
        input.lastMessageAt.toISOString(),
        input.clientId ?? null,
        input.leadId ?? null,
      ],
    );
    return rows[0]!.id;
  });
}

export async function touchMailThread(input: {
  threadId: string;
  snippet: string;
  participants: string[];
  lastMessageAt: Date;
  incrementUnread?: boolean;
}): Promise<void> {
  await withDb(async (query) => {
    const { rows } = await query<{ participants: unknown }>(
      `SELECT participants FROM crm_mail_threads WHERE id = $1`,
      [input.threadId],
    );
    const existing = asStringArray(rows[0]?.participants);
    const merged = [...new Set([...existing, ...input.participants])];

    await query(
      `UPDATE crm_mail_threads SET
         snippet = $2,
         participants = $3::jsonb,
         last_message_at = GREATEST(COALESCE(last_message_at, $4::timestamptz), $4::timestamptz),
         unread_count = unread_count + CASE WHEN $5 THEN 1 ELSE 0 END,
         updated_at = NOW()
       WHERE id = $1`,
      [
        input.threadId,
        input.snippet,
        JSON.stringify(merged),
        input.lastMessageAt.toISOString(),
        input.incrementUnread ?? true,
      ],
    );
  });
}

export async function insertMailMessage(input: {
  threadId: string;
  mailboxId: string;
  messageId: string;
  inReplyTo: string | null;
  uid: number;
  folder: string;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  receivedAt: Date;
  direction?: CrmMailMessageDirection;
}): Promise<{ id: string; inserted: boolean }> {
  return withDb(async (query) => {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO crm_mail_messages (
         thread_id, mailbox_id, message_id, in_reply_to, uid, folder,
         from_address, to_addresses, cc_addresses, subject,
         body_text, body_html, received_at, direction
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8::jsonb, $9::jsonb, $10,
         $11, $12, $13, $14
       )
       ON CONFLICT (mailbox_id, message_id) DO NOTHING
       RETURNING id`,
      [
        input.threadId,
        input.mailboxId,
        input.messageId,
        input.inReplyTo,
        input.uid,
        input.folder,
        input.fromAddress,
        JSON.stringify(input.toAddresses),
        JSON.stringify(input.ccAddresses),
        input.subject.slice(0, 500),
        input.bodyText,
        input.bodyHtml,
        input.receivedAt.toISOString(),
        input.direction ?? "inbound",
      ],
    );
    if (rows[0]) return { id: rows[0].id, inserted: true };

    const existing = await query<{ id: string }>(
      `SELECT id FROM crm_mail_messages WHERE mailbox_id = $1 AND message_id = $2 LIMIT 1`,
      [input.mailboxId, input.messageId],
    );
    return { id: existing.rows[0]!.id, inserted: false };
  });
}

export async function insertMailAttachments(
  messageId: string,
  attachments: Array<{ filename: string; contentType: string; sizeBytes: number }>,
): Promise<void> {
  if (attachments.length === 0) return;
  await withDb(async (query) => {
    for (const att of attachments) {
      await query(
        `INSERT INTO crm_mail_attachments (message_id, filename, content_type, size_bytes)
         VALUES ($1, $2, $3, $4)`,
        [messageId, att.filename, att.contentType, att.sizeBytes],
      );
    }
  });
}

/** UID synthétique pour messages envoyés depuis le CRM (folder CRM-OUT). */
export async function allocateOutboundUid(mailboxId: string): Promise<number> {
  return withDb(async (query) => {
    const { rows } = await query<{ next_uid: string }>(
      `SELECT (COALESCE(MAX(uid), 0) + 1)::text AS next_uid
       FROM crm_mail_messages
       WHERE mailbox_id = $1 AND folder = 'CRM-OUT'`,
      [mailboxId],
    );
    return Number(rows[0]?.next_uid ?? 1);
  });
}

export type ListMailThreadsFilters = {
  mailboxId?: string;
  status?: CrmMailThreadStatus;
  unreadOnly?: boolean;
  search?: string;
  clientId?: string;
  leadId?: string;
  limit?: number;
};

export async function listMailThreads(
  filters: ListMailThreadsFilters = {},
): Promise<CrmMailThread[]> {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const params: unknown[] = [];
  const where: string[] = [];

  if (filters.mailboxId) {
    params.push(filters.mailboxId);
    where.push(`mailbox_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    where.push(`status = $${params.length}`);
  }
  if (filters.unreadOnly) {
    where.push(`unread_count > 0`);
  }
  if (filters.clientId) {
    params.push(filters.clientId);
    where.push(`client_id = $${params.length}`);
  }
  if (filters.leadId) {
    params.push(filters.leadId);
    where.push(`lead_id = $${params.length}`);
  }
  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    where.push(
      `(subject ILIKE $${params.length} OR snippet ILIKE $${params.length} OR participants::text ILIKE $${params.length})`,
    );
  }

  params.push(limit);
  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  return withDb(async (query) => {
    const { rows } = await query<ThreadRow>(
      `SELECT ${THREAD_COLUMNS}
       FROM crm_mail_threads
       ${whereSql}
       ORDER BY COALESCE(last_message_at, created_at) DESC
       LIMIT $${params.length}`,
      params,
    );
    return rows.map(mapThread);
  });
}

export async function linkMailThread(input: {
  threadId: string;
  clientId?: string | null;
  leadId?: string | null;
}): Promise<CrmMailThread | null> {
  return withDb(async (query) => {
    const sets: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [];

    if (input.clientId !== undefined) {
      params.push(input.clientId);
      sets.push(`client_id = $${params.length}`);
    }
    if (input.leadId !== undefined) {
      params.push(input.leadId);
      sets.push(`lead_id = $${params.length}`);
    }
    if (params.length === 0) {
      return getMailThreadById(input.threadId);
    }

    params.push(input.threadId);
    const { rows } = await query<ThreadRow>(
      `UPDATE crm_mail_threads
       SET ${sets.join(", ")}
       WHERE id = $${params.length}
       RETURNING ${THREAD_COLUMNS}`,
      params,
    );
    return rows[0] ? mapThread(rows[0]) : null;
  });
}

export async function getMailThreadById(
  threadId: string,
): Promise<CrmMailThread | null> {
  return withDb(async (query) => {
    const { rows } = await query<ThreadRow>(
      `SELECT ${THREAD_COLUMNS}
       FROM crm_mail_threads
       WHERE id = $1
       LIMIT 1`,
      [threadId],
    );
    return rows[0] ? mapThread(rows[0]) : null;
  });
}

export async function listMailMessagesByThreadId(
  threadId: string,
): Promise<CrmMailMessage[]> {
  return withDb(async (query) => {
    const { rows } = await query<MessageRow>(
      `SELECT ${MESSAGE_COLUMNS}
       FROM crm_mail_messages
       WHERE thread_id = $1
       ORDER BY received_at ASC, created_at ASC`,
      [threadId],
    );
    return rows.map(mapMessage);
  });
}

export async function listMailAttachmentsByMessageIds(
  messageIds: string[],
): Promise<CrmMailAttachment[]> {
  if (messageIds.length === 0) return [];
  return withDb(async (query) => {
    const { rows } = await query<AttachmentRow>(
      `SELECT ${ATTACHMENT_COLUMNS}
       FROM crm_mail_attachments
       WHERE message_id = ANY($1::uuid[])
       ORDER BY created_at ASC`,
      [messageIds],
    );
    return rows.map(mapAttachment);
  });
}

export async function markMailThreadRead(threadId: string): Promise<CrmMailThread | null> {
  return withDb(async (query) => {
    const { rows } = await query<ThreadRow>(
      `UPDATE crm_mail_threads
       SET unread_count = 0, updated_at = NOW()
       WHERE id = $1
       RETURNING ${THREAD_COLUMNS}`,
      [threadId],
    );
    return rows[0] ? mapThread(rows[0]) : null;
  });
}

export async function countUnreadMailThreads(mailboxId?: string): Promise<number> {
  return withDb(async (query) => {
    const { rows } = await query<{ count: string }>(
      mailboxId
        ? `SELECT COUNT(*)::text AS count
           FROM crm_mail_threads
           WHERE mailbox_id = $1 AND unread_count > 0 AND status = 'open'`
        : `SELECT COUNT(*)::text AS count
           FROM crm_mail_threads
           WHERE unread_count > 0 AND status = 'open'`,
      mailboxId ? [mailboxId] : [],
    );
    return Number(rows[0]?.count ?? 0);
  });
}

export async function getMailDraft(
  threadId: string,
  userId: string,
): Promise<CrmMailDraft | null> {
  return withDb(async (query) => {
    const { rows } = await query<DraftRow>(
      `SELECT ${DRAFT_COLUMNS}
       FROM crm_mail_drafts
       WHERE thread_id = $1 AND user_id = $2
       LIMIT 1`,
      [threadId, userId],
    );
    return rows[0] ? mapDraft(rows[0]) : null;
  });
}

export async function upsertMailDraft(input: {
  threadId: string;
  userId: string;
  bodyText: string;
  bodyHtml?: string | null;
  includeSignature?: boolean;
}): Promise<CrmMailDraft> {
  return withDb(async (query) => {
    const { rows } = await query<DraftRow>(
      `INSERT INTO crm_mail_drafts (
         thread_id, user_id, body_text, body_html, include_signature
       ) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (thread_id, user_id) DO UPDATE SET
         body_text = EXCLUDED.body_text,
         body_html = EXCLUDED.body_html,
         include_signature = EXCLUDED.include_signature,
         updated_at = NOW()
       RETURNING ${DRAFT_COLUMNS}`,
      [
        input.threadId,
        input.userId,
        input.bodyText,
        input.bodyHtml ?? null,
        input.includeSignature ?? true,
      ],
    );
    return mapDraft(rows[0]!);
  });
}

export async function deleteMailDraft(
  threadId: string,
  userId: string,
): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(
      `DELETE FROM crm_mail_drafts
       WHERE thread_id = $1 AND user_id = $2`,
      [threadId, userId],
    );
    return (rowCount ?? 0) > 0;
  });
}
