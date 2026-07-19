/**
 * Journalisation appels / chats 3CX → communication_events + timeline CRM.
 */

import { z } from "zod";
import { withDb, isDatabaseConfigured } from "@/lib/db";
import { createLeadActivity } from "@/lib/lead-activities";
import { addClientInteraction } from "@/lib/clients";
import {
  createThreeCxContact,
  lookupThreeCxContact,
  parseEntityId,
  type ThreeCxContactDto,
} from "@/lib/threecx/contacts";

export type CommunicationChannel = "chat" | "call" | "meeting";
export type CommunicationDirection =
  | "inbound"
  | "outbound"
  | "internal"
  | "unknown";

export type CommunicationEvent = {
  id: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  externalId: string;
  leadId: string | null;
  clientId: string | null;
  agentExtension: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
  disposition: string | null;
  summary: string | null;
  createdAt: string;
  duplicate: boolean;
};

const journalBaseSchema = z.object({
  externalId: z.string().trim().min(1).max(200).optional(),
  callId: z.string().trim().min(1).max(200).optional(),
  chatId: z.string().trim().min(1).max(200).optional(),
  entityId: z.string().trim().max(220).optional().nullable(),
  email: z.string().trim().max(255).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  number: z.string().trim().max(50).optional().nullable(),
  direction: z.string().trim().max(40).optional().nullable(),
  callType: z.string().trim().max(40).optional().nullable(),
  agentExtension: z.string().trim().max(50).optional().nullable(),
  agent: z.string().trim().max(50).optional().nullable(),
  durationSec: z.union([z.coerce.number().int().min(0), z.string()]).optional().nullable(),
  duration: z.union([z.coerce.number().int().min(0), z.string()]).optional().nullable(),
  startedAt: z.string().trim().optional().nullable(),
  endedAt: z.string().trim().optional().nullable(),
  disposition: z.string().trim().max(100).optional().nullable(),
  summary: z.string().trim().max(5000).optional().nullable(),
  subject: z.string().trim().max(200).optional().nullable(),
  firstName: z.string().trim().max(80).optional().nullable(),
  lastName: z.string().trim().max(80).optional().nullable(),
  companyName: z.string().trim().max(160).optional().nullable(),
});

export const journalCallSchema = journalBaseSchema;
export const journalChatSchema = journalBaseSchema;

function mapDirection(raw: string | null | undefined): CommunicationDirection {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("inbound") || v === "in" || v.includes("entrant")) return "inbound";
  if (v.includes("outbound") || v === "out" || v.includes("sortant")) return "outbound";
  if (v.includes("internal") || v.includes("interne")) return "internal";
  return "unknown";
}

function parseDate(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Accepte secondes numériques ou durée 3CX `hh:mm:ss`. */
export function parseDurationSec(
  raw: string | number | null | undefined,
): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return Math.floor(raw);
  }
  const s = String(raw).trim();
  if (/^\d+$/.test(s)) return Number(s);
  const m = /^(\d+):(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

async function resolveLinkedContact(input: {
  entityId?: string | null;
  email?: string | null;
  phone?: string | null;
  number?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  channel: CommunicationChannel;
}): Promise<{
  leadId: string | null;
  clientId: string | null;
  contact: ThreeCxContactDto | null;
}> {
  const parsed = parseEntityId(input.entityId);
  if (parsed?.kind === "client") {
    return { leadId: null, clientId: parsed.id, contact: null };
  }
  if (parsed?.kind === "lead") {
    return { leadId: parsed.id, clientId: null, contact: null };
  }

  const phone = input.phone || input.number;
  let contact = await lookupThreeCxContact({
    email: input.email,
    phone,
  });

  if (!contact && (input.email || phone || input.firstName)) {
    contact = await createThreeCxContact({
      firstName: input.firstName,
      lastName: input.lastName,
      companyName: input.companyName,
      email: input.email,
      phone,
      source: input.channel === "call" ? "call_3cx" : "live_chat_3cx",
    });
  }

  if (!contact) {
    return { leadId: null, clientId: null, contact: null };
  }

  if (contact.entityType === "client") {
    return { leadId: null, clientId: contact.id, contact };
  }
  return { leadId: contact.id, clientId: null, contact };
}

async function findExistingEvent(
  channel: CommunicationChannel,
  externalId: string,
): Promise<CommunicationEvent | null> {
  return withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      channel: CommunicationChannel;
      direction: CommunicationDirection;
      external_id: string;
      lead_id: string | null;
      client_id: string | null;
      agent_extension: string | null;
      started_at: Date | null;
      ended_at: Date | null;
      duration_sec: number | null;
      disposition: string | null;
      summary: string | null;
      created_at: Date;
    }>(
      `SELECT * FROM communication_events
       WHERE channel = $1 AND external_id = $2
       LIMIT 1`,
      [channel, externalId],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      channel: row.channel,
      direction: row.direction,
      externalId: row.external_id,
      leadId: row.lead_id,
      clientId: row.client_id,
      agentExtension: row.agent_extension,
      startedAt: row.started_at?.toISOString() ?? null,
      endedAt: row.ended_at?.toISOString() ?? null,
      durationSec: row.duration_sec,
      disposition: row.disposition,
      summary: row.summary,
      createdAt: row.created_at.toISOString(),
      duplicate: true,
    };
  });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

async function insertEvent(input: {
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  externalId: string;
  leadId: string | null;
  clientId: string | null;
  agentExtension: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  durationSec: number | null;
  disposition: string | null;
  summary: string | null;
  raw: unknown;
}): Promise<CommunicationEvent> {
  try {
    return await withDb(async (query) => {
      const { rows } = await query<{
        id: string;
        channel: CommunicationChannel;
        direction: CommunicationDirection;
        external_id: string;
        lead_id: string | null;
        client_id: string | null;
        agent_extension: string | null;
        started_at: Date | null;
        ended_at: Date | null;
        duration_sec: number | null;
        disposition: string | null;
        summary: string | null;
        created_at: Date;
      }>(
        `INSERT INTO communication_events (
           channel, direction, external_id, lead_id, client_id,
           agent_extension, started_at, ended_at, duration_sec,
           disposition, summary, raw_payload
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
         RETURNING *`,
        [
          input.channel,
          input.direction,
          input.externalId,
          input.leadId,
          input.clientId,
          input.agentExtension,
          input.startedAt,
          input.endedAt,
          input.durationSec,
          input.disposition,
          input.summary,
          JSON.stringify(input.raw ?? {}),
        ],
      );
      const row = rows[0]!;
      return {
        id: row.id,
        channel: row.channel,
        direction: row.direction,
        externalId: row.external_id,
        leadId: row.lead_id,
        clientId: row.client_id,
        agentExtension: row.agent_extension,
        startedAt: row.started_at?.toISOString() ?? null,
        endedAt: row.ended_at?.toISOString() ?? null,
        durationSec: row.duration_sec,
        disposition: row.disposition,
        summary: row.summary,
        createdAt: row.created_at.toISOString(),
        duplicate: false,
      };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const existing = await findExistingEvent(input.channel, input.externalId);
      if (existing) return existing;
    }
    throw error;
  }
}

async function writeTimeline(input: {
  channel: CommunicationChannel;
  leadId: string | null;
  clientId: string | null;
  subject: string;
  content: string;
  agentExtension: string | null;
}): Promise<void> {
  const actor = input.agentExtension
    ? `3CX ext. ${input.agentExtension}`
    : "3CX";

  if (input.leadId) {
    await createLeadActivity({
      leadId: input.leadId,
      type: "note",
      subject: input.subject,
      content: input.content,
      actorName: actor,
    });
  }

  if (input.clientId) {
    await addClientInteraction(input.clientId, {
      type: input.channel === "call" ? "call" : "note",
      subject: input.subject,
      content: input.content,
    });
  }
}

export async function journalThreeCxCall(
  raw: z.infer<typeof journalCallSchema>,
): Promise<CommunicationEvent | null> {
  if (!isDatabaseConfigured()) return null;

  const externalId = raw.externalId || raw.callId;
  if (!externalId) throw new Error("externalId ou callId requis");

  const existing = await findExistingEvent("call", externalId);
  if (existing) return existing;

  const linked = await resolveLinkedContact({
    entityId: raw.entityId,
    email: raw.email,
    phone: raw.phone,
    number: raw.number,
    firstName: raw.firstName,
    lastName: raw.lastName,
    companyName: raw.companyName,
    channel: "call",
  });

  const direction = mapDirection(raw.direction ?? raw.callType);
  const durationSec =
    parseDurationSec(raw.durationSec) ?? parseDurationSec(raw.duration);
  const agentExtension = raw.agentExtension ?? raw.agent ?? null;
  const summary =
    raw.summary ||
    raw.subject ||
    `Appel 3CX (${direction})${durationSec != null ? ` — ${durationSec}s` : ""}`;

  const event = await insertEvent({
    channel: "call",
    direction,
    externalId,
    leadId: linked.leadId,
    clientId: linked.clientId,
    agentExtension,
    startedAt: parseDate(raw.startedAt),
    endedAt: parseDate(raw.endedAt),
    durationSec,
    disposition: raw.disposition ?? null,
    summary,
    raw,
  });

  await writeTimeline({
    channel: "call",
    leadId: linked.leadId,
    clientId: linked.clientId,
    subject: "Appel 3CX",
    content: summary,
    agentExtension,
  }).catch((err) => console.error("[3cx] timeline call failed:", err));

  return event;
}

export async function journalThreeCxChat(
  raw: z.infer<typeof journalChatSchema>,
): Promise<CommunicationEvent | null> {
  if (!isDatabaseConfigured()) return null;

  const externalId = raw.externalId || raw.chatId;
  if (!externalId) throw new Error("externalId ou chatId requis");

  const existing = await findExistingEvent("chat", externalId);
  if (existing) return existing;

  const linked = await resolveLinkedContact({
    entityId: raw.entityId,
    email: raw.email,
    phone: raw.phone,
    number: raw.number,
    firstName: raw.firstName,
    lastName: raw.lastName,
    companyName: raw.companyName,
    channel: "chat",
  });

  const direction = mapDirection(raw.direction ?? "inbound");
  const agentExtension = raw.agentExtension ?? raw.agent ?? null;
  const summary =
    raw.summary ||
    raw.subject ||
    `Conversation Live Chat 3CX (${direction})`;

  const event = await insertEvent({
    channel: "chat",
    direction,
    externalId,
    leadId: linked.leadId,
    clientId: linked.clientId,
    agentExtension,
    startedAt: parseDate(raw.startedAt),
    endedAt: parseDate(raw.endedAt),
    durationSec:
      parseDurationSec(raw.durationSec) ?? parseDurationSec(raw.duration),
    disposition: raw.disposition ?? null,
    summary,
    raw,
  });

  await writeTimeline({
    channel: "chat",
    leadId: linked.leadId,
    clientId: linked.clientId,
    subject: "Live Chat 3CX",
    content: summary,
    agentExtension,
  }).catch((err) => console.error("[3cx] timeline chat failed:", err));

  return event;
}
