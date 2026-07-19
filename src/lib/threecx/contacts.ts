/**
 * Lookup / search / création contacts pour le template CRM 3CX.
 */

import { withDb, isDatabaseConfigured } from "@/lib/db";
import { SITE } from "@/lib/constants";
import { createLead, type LeadSource } from "@/lib/leads";
import {
  findClientByMatchEmail,
  findLeadByMatchEmail,
} from "@/lib/mail/link";
import { normalizeMatchEmail } from "@/lib/mail/matching";
import { digitsOnly, phoneMatchVariants } from "@/lib/threecx/phone";

export type ThreeCxEntityKind = "lead" | "client";

export type ThreeCxContactDto = {
  id: string;
  entityType: ThreeCxEntityKind;
  /** Format `lead:{uuid}` / `client:{uuid}` — EntityId pour journaling 3CX. */
  entityId: string;
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  phoneBusiness: string;
  phoneMobile: string;
  contactUrl: string;
};

type ContactRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  kind: ThreeCxEntityKind;
};

export function encodeEntityId(kind: ThreeCxEntityKind, id: string): string {
  return `${kind}:${id}`;
}

export function parseEntityId(
  raw: string | null | undefined,
): { kind: ThreeCxEntityKind; id: string } | null {
  if (!raw?.trim()) return null;
  const [kind, ...rest] = raw.trim().split(":");
  const id = rest.join(":");
  if ((kind !== "lead" && kind !== "client") || !id) return null;
  return { kind, id };
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Contact", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  };
}

export function toThreeCxContactDto(row: ContactRow): ThreeCxContactDto {
  const { firstName, lastName } = splitName(row.name);
  const phone = row.phone?.trim() ?? "";
  const base =
    row.kind === "client"
      ? `${SITE.url}/admin/crm/clients?id=${row.id}`
      : `${SITE.url}/admin/crm/leads?id=${row.id}`;

  return {
    id: row.id,
    entityType: row.kind,
    entityId: encodeEntityId(row.kind, row.id),
    firstName,
    lastName,
    companyName: row.company?.trim() ?? "",
    email: row.email,
    phoneBusiness: phone,
    phoneMobile: phone,
    contactUrl: base,
  };
}

async function findByPhoneDigits(
  variants: string[],
): Promise<ContactRow | null> {
  if (variants.length === 0) return null;

  return withDb(async (query) => {
    const { rows: clients } = await query<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      company: string | null;
    }>(
      `SELECT id, name, email, phone, company
       FROM clients
       WHERE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') = ANY($1::text[])
       ORDER BY updated_at DESC
       LIMIT 1`,
      [variants],
    );
    if (clients[0]) {
      return { ...clients[0], kind: "client" as const };
    }

    const { rows: leads } = await query<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      company: string | null;
    }>(
      `SELECT id, name, email, phone, company
       FROM leads
       WHERE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') = ANY($1::text[])
       ORDER BY updated_at DESC
       LIMIT 1`,
      [variants],
    );
    if (leads[0]) {
      return { ...leads[0], kind: "lead" as const };
    }
    return null;
  });
}

async function loadContactRow(
  kind: ThreeCxEntityKind,
  id: string,
): Promise<ContactRow | null> {
  return withDb(async (query) => {
    const table = kind === "client" ? "clients" : "leads";
    const { rows } = await query<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      company: string | null;
    }>(
      `SELECT id, name, email, phone, company FROM ${table} WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    return { ...row, kind };
  });
}

/**
 * Lookup strict : email exact → téléphone normalisé.
 * Préférence client > lead.
 */
export async function lookupThreeCxContact(input: {
  email?: string | null;
  phone?: string | null;
}): Promise<ThreeCxContactDto | null> {
  if (!isDatabaseConfigured()) return null;

  const email = normalizeMatchEmail(input.email ?? "");
  if (email) {
    const client = await findClientByMatchEmail(email);
    if (client) {
      const row = await loadContactRow("client", client.id);
      if (row) return toThreeCxContactDto(row);
    }
    const lead = await findLeadByMatchEmail(email);
    if (lead) {
      const row = await loadContactRow("lead", lead.id);
      if (row) return toThreeCxContactDto(row);
    }
  }

  const variants = phoneMatchVariants(input.phone);
  const byPhone = await findByPhoneDigits(variants);
  if (byPhone) return toThreeCxContactDto(byPhone);

  return null;
}

/** Recherche libre (Web Client) — nom, société, email, téléphone. */
export async function searchThreeCxContacts(
  q: string,
  limit = 20,
): Promise<ThreeCxContactDto[]> {
  if (!isDatabaseConfigured()) return [];
  const term = q.trim();
  if (term.length < 2) return [];

  const like = `%${term.replace(/[%_]/g, "\\$&")}%`;
  const phoneDigits = digitsOnly(term);
  const capped = Math.min(Math.max(limit, 1), 50);

  return withDb(async (query) => {
    type Row = {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      company: string | null;
    };

    const where = `
      WHERE name ILIKE $1
         OR email ILIKE $1
         OR COALESCE(company, '') ILIKE $1
         OR ($2::text IS NOT NULL AND regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') LIKE '%' || $2 || '%')
      ORDER BY updated_at DESC
      LIMIT $3`;

    const { rows: clients } = await query<Row>(
      `SELECT id, name, email, phone, company FROM clients ${where}`,
      [like, phoneDigits, capped],
    );
    const { rows: leads } = await query<Row>(
      `SELECT id, name, email, phone, company FROM leads ${where}`,
      [like, phoneDigits, capped],
    );

    return [
      ...clients.map((r) => toThreeCxContactDto({ ...r, kind: "client" })),
      ...leads.map((r) => toThreeCxContactDto({ ...r, kind: "lead" })),
    ].slice(0, capped);
  });
}

function placeholderEmail(phoneDigits: string | null): string {
  const suffix = phoneDigits ?? `anon-${Date.now()}`;
  return `3cx+${suffix}@leads.sdcreativ.invalid`;
}

export async function createThreeCxContact(input: {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: LeadSource;
}): Promise<ThreeCxContactDto | null> {
  if (!isDatabaseConfigured()) return null;

  const existing = await lookupThreeCxContact({
    email: input.email,
    phone: input.phone,
  });
  if (existing) return existing;

  const phone = input.phone?.trim() || null;
  const phoneDigs = digitsOnly(phone);
  const email =
    normalizeMatchEmail(input.email ?? "") ?? placeholderEmail(phoneDigs);

  const nameParts = [input.firstName, input.lastName]
    .map((s) => s?.trim())
    .filter(Boolean) as string[];
  const name =
    nameParts.join(" ") ||
    input.companyName?.trim() ||
    (phoneDigs ? `Contact 3CX …${phoneDigs.slice(-4)}` : "Contact 3CX");

  const lead = await createLead({
    name,
    email,
    phone,
    company: input.companyName?.trim() || null,
    source: input.source ?? "live_chat_3cx",
    status: "new",
    message: "Créé automatiquement via intégration 3CX",
    actorName: "3CX",
    metadata: { origin: "threecx_crm" },
  });

  if (!lead) return null;
  return toThreeCxContactDto({
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    kind: "lead",
  });
}
