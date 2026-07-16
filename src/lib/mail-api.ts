import type {
  CrmMailAttachment,
  CrmMailDraft,
  CrmMailMessage,
  CrmMailThread,
  CrmMailThreadStatus,
  CrmMailbox,
} from "@/lib/mail/types";

type ApiError = { error: string };

export type MailThreadMessage = Omit<CrmMailMessage, "rawHeaders">;

export type MailLinkedEntity = {
  id: string;
  name: string;
  email: string;
};

export type MailThreadDetail = {
  thread: CrmMailThread;
  messages: MailThreadMessage[];
  attachments: CrmMailAttachment[];
  draft: CrmMailDraft | null;
  linkedClient?: MailLinkedEntity | null;
  linkedLead?: MailLinkedEntity | null;
};

export type MailThreadListFilters = {
  mailboxId?: string;
  status?: CrmMailThreadStatus;
  unreadOnly?: boolean;
  search?: string;
  clientId?: string;
  leadId?: string;
  limit?: number;
};

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & ApiError;
  if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
  return json;
}

function buildThreadsQuery(filters: MailThreadListFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.mailboxId) params.set("mailboxId", filters.mailboxId);
  if (filters.status) params.set("status", filters.status);
  if (filters.unreadOnly) params.set("unreadOnly", "1");
  if (filters.search) params.set("search", filters.search);
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.leadId) params.set("leadId", filters.leadId);
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchMailMailboxes(): Promise<CrmMailbox[]> {
  const res = await fetch("/api/admin/mail/mailboxes", { credentials: "include" });
  const json = await parseJson<{ mailboxes: CrmMailbox[] }>(res);
  return json.mailboxes;
}

export async function fetchMailThreads(
  filters: MailThreadListFilters = {},
): Promise<{ threads: CrmMailThread[]; unreadCount: number }> {
  const res = await fetch(`/api/admin/mail/threads${buildThreadsQuery(filters)}`, {
    credentials: "include",
  });
  return parseJson(res);
}

export async function fetchMailThreadDetail(
  threadId: string,
  options?: { markRead?: boolean },
): Promise<MailThreadDetail> {
  const qs = options?.markRead === false ? "?markRead=0" : "";
  const res = await fetch(`/api/admin/mail/threads/${threadId}${qs}`, {
    credentials: "include",
  });
  return parseJson(res);
}

export async function syncMailMailbox(mailboxId: string): Promise<{
  mailboxId: string;
  email: string;
  fetched: number;
  inserted: number;
  skipped: number;
  lastUid: number;
  error?: string;
}> {
  const res = await fetch(`/api/admin/mail/mailboxes/${mailboxId}/sync`, {
    method: "POST",
    credentials: "include",
  });
  const json = await parseJson<{ result: {
    mailboxId: string;
    email: string;
    fetched: number;
    inserted: number;
    skipped: number;
    lastUid: number;
    error?: string;
  } }>(res);
  return json.result;
}

export type MailPhase1ValidationResponse = {
  go: boolean;
  sharedMailbox: string;
  messageCount: number;
  threadCount: number;
  attachmentCount: number;
  mailboxConfigured: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  syncEnabled: boolean;
  checks: Array<{
    id: string;
    label: string;
    ok: boolean;
    detail: string;
    required: boolean;
  }>;
  blockers: string[];
};

export async function fetchMailPhase1Validation(): Promise<MailPhase1ValidationResponse> {
  const res = await fetch("/api/admin/mail/validation", { credentials: "include" });
  const json = await parseJson<{ validation: MailPhase1ValidationResponse }>(res);
  return json.validation;
}

export async function replyMailThreadApi(
  threadId: string,
  input: {
    bodyText: string;
    bodyHtml?: string | null;
    includeSignature?: boolean;
    mode?: "reply" | "replyAll" | "forward";
    to?: string;
    cc?: string;
    bcc?: string;
    subject?: string;
    attachments?: Array<{
      filename: string;
      contentType: string;
      contentBase64: string;
    }>;
  },
): Promise<{
  message: MailThreadMessage;
  to: string[];
  cc?: string[];
  thread?: CrmMailThread | null;
}> {
  const res = await fetch(`/api/admin/mail/threads/${threadId}/reply`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function composeMailApi(input: {
  mailboxId: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  includeSignature?: boolean;
  attachments?: Array<{
    filename: string;
    contentType: string;
    contentBase64: string;
  }>;
}): Promise<{
  thread: CrmMailThread;
  message: MailThreadMessage;
  to: string[];
}> {
  const res = await fetch("/api/admin/mail/threads", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export type MailContactSuggestion = {
  email: string;
  name: string;
  source: "client" | "lead";
};

export async function searchMailContactsApi(q: string): Promise<MailContactSuggestion[]> {
  const params = new URLSearchParams({ q });
  const res = await fetch(`/api/admin/mail/contacts?${params}`, {
    credentials: "include",
  });
  const json = await parseJson<{ contacts: MailContactSuggestion[] }>(res);
  return json.contacts;
}

export function mailAttachmentDownloadUrl(attachmentId: string): string {
  return `/api/admin/mail/attachments/${attachmentId}`;
}

export async function saveMailDraftApi(
  threadId: string,
  input: {
    bodyText: string;
    bodyHtml?: string | null;
    includeSignature?: boolean;
  },
): Promise<CrmMailDraft | null> {
  const res = await fetch(`/api/admin/mail/threads/${threadId}/draft`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ draft: CrmMailDraft | null }>(res);
  return json.draft;
}

export async function deleteMailDraftApi(threadId: string): Promise<void> {
  const res = await fetch(`/api/admin/mail/threads/${threadId}/draft`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson<{ ok: boolean }>(res);
}

export async function deleteMailMessageApi(
  messageId: string,
): Promise<{ deleted: number; threadsDeleted: string[] }> {
  const res = await fetch(`/api/admin/mail/messages/${messageId}`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseJson(res);
}

export async function bulkDeleteMailMessagesApi(
  ids: string[],
): Promise<{ deleted: number; threadsDeleted: string[] }> {
  const res = await fetch("/api/admin/mail/messages/bulk-delete", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  return parseJson(res);
}

export async function deleteMailThreadApi(threadId: string): Promise<{ deleted: number }> {
  const res = await fetch(`/api/admin/mail/threads/${threadId}`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseJson(res);
}

export async function bulkDeleteMailThreadsApi(
  ids: string[],
): Promise<{ deleted: number }> {
  const res = await fetch("/api/admin/mail/threads/bulk-delete", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  return parseJson(res);
}

export async function linkMailThreadApi(
  threadId: string,
  input: { clientId?: string | null; leadId?: string | null },
): Promise<CrmMailThread> {
  const res = await fetch(`/api/admin/mail/threads/${threadId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ thread: CrmMailThread }>(res);
  return json.thread;
}

export async function createLeadFromMailThreadApi(threadId: string): Promise<{
  lead: { id: string; name: string; email: string } | null;
  linkedClient?: MailLinkedEntity | null;
  linkedLead?: MailLinkedEntity | null;
  thread: CrmMailThread | null;
  message?: string;
}> {
  const res = await fetch(`/api/admin/mail/threads/${threadId}/create-lead`, {
    method: "POST",
    credentials: "include",
  });
  return parseJson(res);
}

export async function createTicketFromMailThreadApi(threadId: string): Promise<{
  ticket: { id: string; reference: string; subject: string };
}> {
  const res = await fetch(`/api/admin/mail/threads/${threadId}/create-ticket`, {
    method: "POST",
    credentials: "include",
  });
  return parseJson(res);
}

/** Connecte / met à jour une boîte (MDP chiffré). Ne jamais logger le password. */
export async function connectMailMailboxApi(input: {
  email: string;
  password: string;
  displayName?: string;
  userId?: string | null;
}): Promise<CrmMailbox> {
  const res = await fetch("/api/admin/mail/mailboxes", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ mailbox: CrmMailbox }>(res);
  return json.mailbox;
}
