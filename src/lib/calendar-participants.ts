import { z } from "zod";
import { withDb } from "@/lib/db";
import type { CalendarParticipant, ParticipantInput, RsvpStatus } from "@/lib/calendar-participants-shared";

export {
  RSVP_STATUSES,
  RSVP_STATUS_LABELS,
  summarizeRsvp,
  type CalendarParticipant,
  type ParticipantInput,
  type RsvpStatus,
} from "@/lib/calendar-participants-shared";

type ParticipantRow = {
  id: string;
  event_id: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: string;
  invited_at: Date;
  responded_at?: Date | null;
};

function normalizeStatus(raw: string | null | undefined): RsvpStatus {
  if (raw === "accepted" || raw === "declined" || raw === "tentative" || raw === "pending") {
    return raw;
  }
  return "pending";
}

function mapParticipant(row: ParticipantRow): CalendarParticipant {
  return {
    id: row.id,
    eventId: row.event_id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    status: normalizeStatus(row.status),
    invitedAt: row.invited_at.toISOString(),
    respondedAt: row.responded_at ? row.responded_at.toISOString() : null,
  };
}

export const participantSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().max(160).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
});

export const rsvpStatusSchema = z.enum(["accepted", "declined", "tentative"]);

let ensuredRsvpColumns = false;

export async function ensureCalendarParticipantRsvpColumns(): Promise<void> {
  if (ensuredRsvpColumns) return;
  await withDb(async (query) => {
    await query(`
      ALTER TABLE calendar_event_participants
        ADD COLUMN IF NOT EXISTS phone VARCHAR(32)
    `);
    await query(`
      ALTER TABLE calendar_event_participants
        ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ
    `);
  });
  ensuredRsvpColumns = true;
}

export async function listEventParticipants(eventId: string): Promise<CalendarParticipant[]> {
  await ensureCalendarParticipantRsvpColumns();
  return withDb(async (query) => {
    const { rows } = await query<ParticipantRow>(
      `SELECT id, event_id, email, name, phone, status, invited_at, responded_at
       FROM calendar_event_participants
       WHERE event_id = $1
       ORDER BY invited_at ASC`,
      [eventId],
    );
    return rows.map(mapParticipant);
  });
}

export async function getEventParticipantByEmail(
  eventId: string,
  email: string,
): Promise<CalendarParticipant | null> {
  await ensureCalendarParticipantRsvpColumns();
  return withDb(async (query) => {
    const { rows } = await query<ParticipantRow>(
      `SELECT id, event_id, email, name, phone, status, invited_at, responded_at
       FROM calendar_event_participants
       WHERE event_id = $1 AND LOWER(email) = LOWER($2)
       LIMIT 1`,
      [eventId, email.trim()],
    );
    return rows[0] ? mapParticipant(rows[0]) : null;
  });
}

export async function setParticipantRsvpStatus(
  eventId: string,
  email: string,
  status: Exclude<RsvpStatus, "pending">,
): Promise<CalendarParticipant | null> {
  await ensureCalendarParticipantRsvpColumns();
  return withDb(async (query) => {
    const { rows } = await query<ParticipantRow>(
      `UPDATE calendar_event_participants
       SET status = $3, responded_at = NOW()
       WHERE event_id = $1 AND LOWER(email) = LOWER($2)
       RETURNING id, event_id, email, name, phone, status, invited_at, responded_at`,
      [eventId, email.trim(), status],
    );
    return rows[0] ? mapParticipant(rows[0]) : null;
  });
}

export async function syncEventParticipants(
  eventId: string,
  participants: ParticipantInput[],
): Promise<{ participants: CalendarParticipant[]; newParticipants: ParticipantInput[] }> {
  await ensureCalendarParticipantRsvpColumns();
  return withDb(async (query) => {
    const { rows: existingRows } = await query<ParticipantRow>(
      `SELECT id, event_id, email, name, phone, status, invited_at, responded_at
       FROM calendar_event_participants WHERE event_id = $1`,
      [eventId],
    );
    const existingEmails = new Set(existingRows.map((r) => r.email.toLowerCase()));
    const incomingEmails = new Set(participants.map((p) => p.email.toLowerCase()));

    for (const row of existingRows) {
      if (!incomingEmails.has(row.email.toLowerCase())) {
        await query(`DELETE FROM calendar_event_participants WHERE id = $1`, [row.id]);
      }
    }

    const newParticipants: ParticipantInput[] = [];
    for (const p of participants) {
      const email = p.email.toLowerCase();
      if (!existingEmails.has(email)) {
        await query(
          `INSERT INTO calendar_event_participants (event_id, email, name, phone) VALUES ($1, $2, $3, $4)`,
          [eventId, email, p.name ?? null, p.phone ?? null],
        );
        newParticipants.push(p);
      } else {
        await query(
          `UPDATE calendar_event_participants
           SET name = $2, phone = $3
           WHERE event_id = $1 AND LOWER(email) = LOWER($4)`,
          [eventId, p.name ?? null, p.phone ?? null, email],
        );
      }
    }

    const list = await listEventParticipants(eventId);
    return { participants: list, newParticipants };
  });
}

export type RecentRsvpRow = {
  eventId: string;
  eventTitle: string;
  email: string;
  name: string | null;
  status: RsvpStatus;
  respondedAt: string;
};

/** Réponses RSVP depuis `since` (pour digest matinal). */
export async function listRecentRsvpResponses(since: Date): Promise<RecentRsvpRow[]> {
  await ensureCalendarParticipantRsvpColumns();
  return withDb(async (query) => {
    const { rows } = await query<{
      event_id: string;
      event_title: string;
      email: string;
      name: string | null;
      status: string;
      responded_at: Date;
    }>(
      `SELECT p.event_id, e.title AS event_title, p.email, p.name, p.status, p.responded_at
       FROM calendar_event_participants p
       JOIN calendar_events e ON e.id = p.event_id
       WHERE p.responded_at IS NOT NULL
         AND p.responded_at >= $1
         AND p.status IN ('accepted', 'declined', 'tentative')
       ORDER BY p.responded_at DESC
       LIMIT 200`,
      [since.toISOString()],
    );
    return rows.map((row) => ({
      eventId: row.event_id,
      eventTitle: row.event_title,
      email: row.email,
      name: row.name,
      status: normalizeStatus(row.status),
      respondedAt: row.responded_at.toISOString(),
    }));
  });
}

export type TodayMeetingRow = {
  eventId: string;
  title: string;
  startsAt: string;
  allDay: boolean;
  type: string;
  meetingPlatform: string | null;
  meetingUrl: string | null;
  pendingCount: number;
  totalParticipants: number;
};

export type PendingRsvpEventSummary = {
  eventId: string;
  title: string;
  startsAt: string;
  allDay: boolean;
  type: string;
  pendingCount: number;
  totalParticipants: number;
};

/** Réunions / appels du jour (fuseau serveur). */
export async function listTodayMeetings(options?: {
  assignee?: string;
  limit?: number;
}): Promise<TodayMeetingRow[]> {
  await ensureCalendarParticipantRsvpColumns();
  const limit = options?.limit ?? 12;
  return withDb(async (query) => {
    const params: unknown[] = [];
    let assigneeClause = "";
    if (options?.assignee?.trim()) {
      params.push(options.assignee.trim());
      assigneeClause = ` AND (e.assignee = $${params.length} OR e.assignee ILIKE $${params.length})`;
    }
    params.push(limit);
    const { rows } = await query<{
      id: string;
      title: string;
      starts_at: Date;
      all_day: boolean;
      type: string;
      metadata: Record<string, unknown> | null;
      pending_count: string;
      total_participants: string;
    }>(
      `SELECT e.id, e.title, e.starts_at, e.all_day, e.type, e.metadata,
              COUNT(p.id) FILTER (WHERE p.status = 'pending')::text AS pending_count,
              COUNT(p.id)::text AS total_participants
       FROM calendar_events e
       LEFT JOIN calendar_event_participants p ON p.event_id = e.id
       WHERE e.type IN ('meeting', 'call')
         AND e.starts_at::date = CURRENT_DATE
         ${assigneeClause}
       GROUP BY e.id
       ORDER BY e.starts_at ASC
       LIMIT $${params.length}`,
      params,
    );
    return rows.map((row) => {
      const meta = row.metadata ?? {};
      return {
        eventId: row.id,
        title: row.title,
        startsAt: row.starts_at.toISOString(),
        allDay: row.all_day,
        type: row.type,
        meetingPlatform:
          typeof meta.meetingPlatform === "string" ? meta.meetingPlatform : null,
        meetingUrl: typeof meta.meetingUrl === "string" ? meta.meetingUrl : null,
        pendingCount: Number(row.pending_count) || 0,
        totalParticipants: Number(row.total_participants) || 0,
      };
    });
  });
}

/** Événements à venir avec au moins un RSVP pending. */
export async function listUpcomingEventsWithPendingRsvp(
  limit = 10,
): Promise<PendingRsvpEventSummary[]> {
  await ensureCalendarParticipantRsvpColumns();
  return withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      title: string;
      starts_at: Date;
      all_day: boolean;
      type: string;
      pending_count: string;
      total_participants: string;
    }>(
      `SELECT e.id, e.title, e.starts_at, e.all_day, e.type,
              COUNT(p.id) FILTER (WHERE p.status = 'pending')::text AS pending_count,
              COUNT(p.id)::text AS total_participants
       FROM calendar_events e
       JOIN calendar_event_participants p ON p.event_id = e.id
       WHERE e.starts_at >= NOW() - INTERVAL '2 hours'
       GROUP BY e.id
       HAVING COUNT(p.id) FILTER (WHERE p.status = 'pending') > 0
       ORDER BY e.starts_at ASC
       LIMIT $1`,
      [limit],
    );
    return rows.map((row) => ({
      eventId: row.id,
      title: row.title,
      startsAt: row.starts_at.toISOString(),
      allDay: row.all_day,
      type: row.type,
      pendingCount: Number(row.pending_count) || 0,
      totalParticipants: Number(row.total_participants) || 0,
    }));
  });
}
