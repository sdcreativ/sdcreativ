/**
 * Matching + liaison email ↔ client / lead (Phase 3).
 */

import { withDb } from "@/lib/db";
import {
  normalizeMatchEmail,
  SQL_NORMALIZE_EMAIL,
} from "@/lib/mail/matching";
import {
  getMailThreadById,
  linkMailThread,
} from "@/lib/mail/repository";
import { uniqueEmails } from "@/lib/mail/threading";

export type MailMatchHit = {
  id: string;
  name: string;
  email: string;
  kind: "client" | "lead";
};

export async function findClientByMatchEmail(
  rawEmail: string,
): Promise<MailMatchHit | null> {
  const normalized = normalizeMatchEmail(rawEmail);
  if (!normalized) return null;

  return withDb(async (query) => {
    const { rows } = await query<{ id: string; name: string; email: string }>(
      `SELECT id, name, email
       FROM clients
       WHERE ${SQL_NORMALIZE_EMAIL} = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [normalized],
    );
    const row = rows[0];
    if (!row) return null;
    return { id: row.id, name: row.name, email: row.email, kind: "client" };
  });
}

export async function findLeadByMatchEmail(
  rawEmail: string,
): Promise<MailMatchHit | null> {
  const normalized = normalizeMatchEmail(rawEmail);
  if (!normalized) return null;

  return withDb(async (query) => {
    const { rows } = await query<{ id: string; name: string; email: string }>(
      `SELECT id, name, email
       FROM leads
       WHERE ${SQL_NORMALIZE_EMAIL} = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [normalized],
    );
    const row = rows[0];
    if (!row) return null;
    return { id: row.id, name: row.name, email: row.email, kind: "lead" };
  });
}

/**
 * Cherche un client puis un lead pour une liste d’adresses (from + participants).
 * Préférence : client > lead.
 */
export async function resolveMailEntityMatch(
  addresses: string[],
): Promise<MailMatchHit | null> {
  const emails = uniqueEmails(addresses);
  for (const email of emails) {
    const client = await findClientByMatchEmail(email);
    if (client) return client;
  }
  for (const email of emails) {
    const lead = await findLeadByMatchEmail(email);
    if (lead) return lead;
  }
  return null;
}

/**
 * Auto-lie un thread s’il n’a encore ni client ni lead.
 * Retourne le hit appliqué ou null.
 */
export async function tryAutoLinkMailThread(input: {
  threadId: string;
  fromAddress: string;
  participants: string[];
}): Promise<MailMatchHit | null> {
  const thread = await getMailThreadById(input.threadId);
  if (!thread) return null;
  if (thread.clientId || thread.leadId) return null;

  const hit = await resolveMailEntityMatch([
    input.fromAddress,
    ...input.participants,
  ]);
  if (!hit) return null;

  await linkMailThread({
    threadId: input.threadId,
    clientId: hit.kind === "client" ? hit.id : null,
    leadId: hit.kind === "lead" ? hit.id : null,
  });
  return hit;
}
