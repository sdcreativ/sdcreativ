import {
  getHostingerMailWebhookSecret,
  isHostingerMailWebhookConfigured,
  isMailCredentialsSecretConfigured,
  MAIL_V1_SHARED_MAILBOX,
} from "@/lib/mail/config";
import {
  extractMailboxEmailFromWebhook,
  isMessageReceivedEvent,
  type HostingerMailWebhookPayload,
} from "@/lib/mail/webhook-payload";
import {
  syncMailboxByEmail,
  type MailboxSyncResult,
} from "@/lib/mail/sync";
import { sanitizeMailError } from "@/lib/mail/sanitize-error";

const DEBOUNCE_MS = 4_000;
const WEBHOOK_SYNC_LIMIT = 20;

const lastTriggeredAt = new Map<string, number>();
const inFlight = new Set<string>();

export function verifyHostingerMailWebhookAuth(request: Request): boolean {
  const secret = getHostingerMailWebhookSecret();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  // Fallback rare (proxies) — même secret en query
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (token && token === secret) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function shouldDebounce(email: string): boolean {
  const key = email.toLowerCase();
  const now = Date.now();
  const last = lastTriggeredAt.get(key) ?? 0;
  if (now - last < DEBOUNCE_MS) return true;
  if (inFlight.has(key)) return true;
  lastTriggeredAt.set(key, now);
  return false;
}

export type HostingerMailWebhookResult = {
  ok: boolean;
  ignored?: boolean;
  reason?: string;
  mailboxEmail: string | null;
  sync?: MailboxSyncResult;
};

/**
 * Traite un webhook Agentic Mail : sync IMAP incrémentale (UID) de la boîte ciblée.
 * Ne re-télécharge pas toute la boîte — s’appuie sur last_uid.
 */
export async function handleHostingerMailWebhook(
  body: HostingerMailWebhookPayload,
): Promise<HostingerMailWebhookResult> {
  if (!isHostingerMailWebhookConfigured()) {
    return {
      ok: false,
      mailboxEmail: null,
      reason: "HOSTINGER_MAIL_WEBHOOK_SECRET non configuré.",
    };
  }

  if (!isMailCredentialsSecretConfigured()) {
    return {
      ok: false,
      mailboxEmail: null,
      reason: "MAIL_CREDENTIALS_SECRET manquant.",
    };
  }

  if (!isMessageReceivedEvent(body)) {
    return {
      ok: true,
      ignored: true,
      mailboxEmail: null,
      reason: "Événement ignoré (pas message.received).",
    };
  }

  const mailboxEmail =
    extractMailboxEmailFromWebhook(body) ?? MAIL_V1_SHARED_MAILBOX;

  if (shouldDebounce(mailboxEmail)) {
    return {
      ok: true,
      ignored: true,
      mailboxEmail,
      reason: "Debounce — sync récente ou en cours.",
    };
  }

  const key = mailboxEmail.toLowerCase();
  inFlight.add(key);
  try {
    const sync = await syncMailboxByEmail(mailboxEmail, {
      limit: WEBHOOK_SYNC_LIMIT,
    });
    return {
      ok: !sync.error,
      mailboxEmail,
      sync,
      reason: sync.error,
    };
  } catch (error) {
    return {
      ok: false,
      mailboxEmail,
      reason: sanitizeMailError(error, "Échec sync webhook."),
    };
  } finally {
    inFlight.delete(key);
  }
}
