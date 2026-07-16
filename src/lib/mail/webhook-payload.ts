import { extractEmailAddress, uniqueEmails } from "@/lib/mail/threading";
import { MAIL_V1_SHARED_MAILBOX } from "@/lib/mail/config";

export type HostingerMailWebhookPayload = {
  event?: string;
  event_type?: string;
  type?: string;
  mailbox?: string;
  email?: string;
  to?: unknown;
  from?: unknown;
  message?: {
    to?: unknown;
    from?: unknown;
    inbox_id?: string;
    subject?: string;
  };
  data?: {
    mailbox?: string;
    email?: string;
    to?: unknown;
    message?: { to?: unknown };
  };
};

/**
 * Extrait l’adresse de la boîte CRM concernée depuis le payload Agentic Mail.
 * Formats Hostinger / AgentMail tolérés (souples).
 */
export function extractMailboxEmailFromWebhook(
  body: HostingerMailWebhookPayload,
): string | null {
  const candidates: string[] = [];

  const push = (raw: unknown) => {
    if (typeof raw === "string" && raw.trim()) {
      candidates.push(raw);
      return;
    }
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (typeof item === "string") candidates.push(item);
        else if (item && typeof item === "object" && "email" in item) {
          const email = (item as { email?: unknown }).email;
          if (typeof email === "string") candidates.push(email);
        }
      }
    }
  };

  push(body.mailbox);
  push(body.email);
  push(body.to);
  push(body.message?.to);
  push(body.data?.mailbox);
  push(body.data?.email);
  push(body.data?.to);
  push(body.data?.message?.to);

  // inbox_id parfois = adresse complète
  if (typeof body.message?.inbox_id === "string") {
    push(body.message.inbox_id);
  }

  const emails = uniqueEmails(candidates.map((c) => extractEmailAddress(c)));
  if (emails.length === 0) return null;

  // Préférer une adresse @domaine connu / contact@
  const contact = emails.find((e) => e === MAIL_V1_SHARED_MAILBOX);
  if (contact) return contact;

  return emails[0] ?? null;
}

export function isMessageReceivedEvent(body: HostingerMailWebhookPayload): boolean {
  const event =
    body.event_type ?? body.event ?? (typeof body.type === "string" ? body.type : "");
  const normalized = event.trim().toLowerCase();
  if (!normalized) return true; // Hostinger Test / payload minimal
  return (
    normalized === "message.received" ||
    normalized.startsWith("message.received.") ||
    normalized === "event"
  );
}
