import { z } from "zod";
import { withDb } from "@/lib/db";

export type NewsletterSubscriber = {
  id: string;
  email: string;
  consentAt: string;
  source: string;
  status: "active" | "unsubscribed";
  unsubscribedAt: string | null;
  createdAt: string;
};

export type WaitlistEntry = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  interest: string;
  message: string | null;
  createdAt: string;
};

type SubscriberRow = {
  id: string;
  email: string;
  consent_at: Date;
  source: string;
  status: string;
  unsubscribed_at: Date | null;
  created_at: Date;
};

type WaitlistRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  interest: string;
  message: string | null;
  created_at: Date;
};

function mapSubscriber(row: SubscriberRow): NewsletterSubscriber {
  return {
    id: row.id,
    email: row.email,
    consentAt: row.consent_at.toISOString(),
    source: row.source,
    status: row.status === "unsubscribed" ? "unsubscribed" : "active",
    unsubscribedAt: row.unsubscribed_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

function mapWaitlist(row: WaitlistRow): WaitlistEntry {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company,
    interest: row.interest,
    message: row.message,
    createdAt: row.created_at.toISOString(),
  };
}

export const createNewsletterSubscriberSchema = z.object({
  email: z.string().trim().email().max(255),
  source: z.string().trim().max(50).default("website"),
});

export async function upsertNewsletterSubscriber(
  input: z.infer<typeof createNewsletterSubscriberSchema>,
): Promise<NewsletterSubscriber> {
  return withDb(async (query) => {
    const { rows } = await query<SubscriberRow>(
      `INSERT INTO newsletter_subscribers (email, source, status, consent_at)
       VALUES ($1, $2, 'active', NOW())
       ON CONFLICT (email) DO UPDATE SET
         status = 'active',
         unsubscribed_at = NULL,
         source = EXCLUDED.source,
         consent_at = NOW()
       RETURNING *`,
      [input.email.toLowerCase(), input.source],
    );
    return mapSubscriber(rows[0]!);
  });
}

export async function listNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  return withDb(async (query) => {
    const { rows } = await query<SubscriberRow>(
      `SELECT * FROM newsletter_subscribers ORDER BY created_at DESC`,
    );
    return rows.map(mapSubscriber);
  });
}

export async function unsubscribeNewsletterSubscriber(id: string): Promise<void> {
  await withDb(async (query) => {
    await query(
      `UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = NOW() WHERE id = $1`,
      [id],
    );
  });
}

export async function deleteNewsletterSubscriber(id: string): Promise<void> {
  await withDb(async (query) => {
    await query(`DELETE FROM newsletter_subscribers WHERE id = $1`, [id]);
  });
}

export const createWaitlistEntrySchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(255),
  company: z.string().trim().max(160).optional().nullable(),
  interest: z.string().trim().max(50),
  message: z.string().trim().max(2000).optional().nullable(),
});

export async function createWaitlistEntry(
  input: z.infer<typeof createWaitlistEntrySchema>,
): Promise<WaitlistEntry> {
  return withDb(async (query) => {
    const { rows } = await query<WaitlistRow>(
      `INSERT INTO waitlist_entries (name, email, company, interest, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        input.name,
        input.email.toLowerCase(),
        input.company ?? null,
        input.interest,
        input.message ?? null,
      ],
    );
    return mapWaitlist(rows[0]!);
  });
}

export async function listWaitlistEntries(): Promise<WaitlistEntry[]> {
  return withDb(async (query) => {
    const { rows } = await query<WaitlistRow>(
      `SELECT * FROM waitlist_entries ORDER BY created_at DESC`,
    );
    return rows.map(mapWaitlist);
  });
}

export async function deleteWaitlistEntry(id: string): Promise<void> {
  await withDb(async (query) => {
    await query(`DELETE FROM waitlist_entries WHERE id = $1`, [id]);
  });
}
