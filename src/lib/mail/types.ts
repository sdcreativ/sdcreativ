/** Types alignés sur le schéma Messagerie CRM (Phase 1.1). */

export type CrmMailThreadStatus = "open" | "archived";
export type CrmMailMessageDirection = "inbound" | "outbound";

export type CrmMailbox = {
  id: string;
  email: string;
  displayName: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  /** Présent seulement côté serveur — jamais exposé à l’API client. */
  credentialsEncrypted?: string;
  active: boolean;
  userId: string | null;
  lastSyncAt: string | null;
  lastUid: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmMailThread = {
  id: string;
  mailboxId: string;
  subject: string;
  snippet: string;
  participants: string[];
  lastMessageAt: string | null;
  unreadCount: number;
  clientId: string | null;
  leadId: string | null;
  status: CrmMailThreadStatus;
  createdAt: string;
  updatedAt: string;
};

export type CrmMailMessage = {
  id: string;
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
  receivedAt: string;
  direction: CrmMailMessageDirection;
  rawHeaders: Record<string, unknown>;
  createdAt: string;
};

export type CrmMailAttachment = {
  id: string;
  messageId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  s3Key: string | null;
  createdAt: string;
};

export type CrmMailDraft = {
  id: string;
  threadId: string;
  userId: string;
  bodyText: string;
  bodyHtml: string | null;
  includeSignature: boolean;
  createdAt: string;
  updatedAt: string;
};
