import { z } from "zod";
import { withDb } from "@/lib/db";
import type { CalendarItemType, EventType, MeetingPlatform } from "@/content/calendar-labels";
import { EVENT_TYPES, MEETING_PLATFORMS } from "@/content/calendar-labels";

export type CalendarItem = {
  id: string;
  title: string;
  description: string | null;
  type: CalendarItemType;
  source: "event" | "project" | "task" | "quote" | "ticket";
  sourceId: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  assignee: string | null;
  linkHref: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  assignee: string | null;
  clientId: string | null;
  projectId: string | null;
  meetingPlatform: MeetingPlatform | null;
  meetingUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  starts_at: Date;
  ends_at: Date | null;
  all_day: boolean;
  assignee: string | null;
  client_id: string | null;
  project_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
};

function readMeetingMeta(metadata: Record<string, unknown> | null): {
  meetingPlatform: MeetingPlatform | null;
  meetingUrl: string | null;
} {
  const platform = metadata?.meetingPlatform;
  const url = metadata?.meetingUrl;
  return {
    meetingPlatform:
      typeof platform === "string" &&
      MEETING_PLATFORMS.includes(platform as MeetingPlatform)
        ? (platform as MeetingPlatform)
        : null,
    meetingUrl: typeof url === "string" && url.trim() ? url.trim() : null,
  };
}

function mapEvent(row: EventRow): CalendarEvent {
  const meeting = readMeetingMeta(row.metadata);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at?.toISOString() ?? null,
    allDay: row.all_day,
    assignee: row.assignee,
    clientId: row.client_id,
    projectId: row.project_id,
    meetingPlatform: meeting.meetingPlatform,
    meetingUrl: meeting.meetingUrl,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const createEventSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  type: z.enum(EVENT_TYPES).default("meeting"),
  startsAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  endsAt: z.string().datetime({ offset: true }).optional().nullable(),
  allDay: z.boolean().default(false),
  assignee: z.string().trim().max(100).optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  meetingPlatform: z.enum(MEETING_PLATFORMS).optional().nullable(),
  meetingUrl: z.string().trim().max(500).optional().nullable(),
});

export const updateEventSchema = createEventSchema.partial();

function parseStartsAt(input: string, allDay: boolean): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return new Date(`${input}T${allDay ? "12:00:00" : "09:00:00"}.000Z`);
  }
  return new Date(input);
}

export async function listCalendarItems(from: Date, to: Date): Promise<CalendarItem[]> {
  return withDb(async (query) => {
    const items: CalendarItem[] = [];

    const { rows: events } = await query<EventRow>(
      `SELECT * FROM calendar_events
       WHERE starts_at >= $1 AND starts_at <= $2
       ORDER BY starts_at ASC`,
      [from, to],
    );

    for (const row of events) {
      items.push({
        id: `event-${row.id}`,
        title: row.title,
        description: row.description,
        type: row.type,
        source: "event",
        sourceId: row.id,
        startsAt: row.starts_at.toISOString(),
        endsAt: row.ends_at?.toISOString() ?? null,
        allDay: row.all_day,
        assignee: row.assignee,
        linkHref: null,
      });
    }

    const { rows: projects } = await query<{
      id: string;
      name: string;
      due_date: Date;
      client_name: string;
    }>(
      `SELECT p.id, p.name, p.due_date, COALESCE(c.company, c.name) AS client_name
       FROM projects p
       JOIN clients c ON c.id = p.client_id
       WHERE p.due_date IS NOT NULL
         AND p.due_date >= $1::date AND p.due_date <= $2::date
         AND p.status NOT IN ('delivered', 'cancelled')`,
      [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)],
    );

    for (const row of projects) {
      const day = row.due_date.toISOString().slice(0, 10);
      items.push({
        id: `project-${row.id}`,
        title: `Livraison — ${row.name}`,
        description: row.client_name,
        type: "project_deadline",
        source: "project",
        sourceId: row.id,
        startsAt: `${day}T12:00:00.000Z`,
        endsAt: null,
        allDay: true,
        assignee: null,
        linkHref: "/admin/crm/projets",
      });
    }

    const { rows: tasks } = await query<{
      id: string;
      title: string;
      due_date: Date;
      assignee: string | null;
    }>(
      `SELECT id, title, due_date, assignee FROM tasks
       WHERE due_date IS NOT NULL
         AND due_date >= $1::date AND due_date <= $2::date
         AND status != 'done'`,
      [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)],
    );

    for (const row of tasks) {
      const day = row.due_date.toISOString().slice(0, 10);
      items.push({
        id: `task-${row.id}`,
        title: row.title,
        description: null,
        type: "task_due",
        source: "task",
        sourceId: row.id,
        startsAt: `${day}T12:00:00.000Z`,
        endsAt: null,
        allDay: true,
        assignee: row.assignee,
        linkHref: "/admin/crm/taches",
      });
    }

    const { rows: quotes } = await query<{
      id: string;
      reference: string;
      project_label: string;
      follow_up_at: Date;
    }>(
      `SELECT id, reference, project_label, follow_up_at FROM quotes
       WHERE follow_up_at IS NOT NULL
         AND follow_up_at >= $1 AND follow_up_at <= $2
         AND status NOT IN ('accepted', 'rejected', 'expired')`,
      [from, to],
    );

    for (const row of quotes) {
      items.push({
        id: `quote-${row.id}`,
        title: `Relance — ${row.project_label}`,
        description: row.reference,
        type: "quote_followup",
        source: "quote",
        sourceId: row.id,
        startsAt: row.follow_up_at.toISOString(),
        endsAt: null,
        allDay: false,
        assignee: null,
        linkHref: "/admin/crm/devis",
      });
    }

    const { rows: tickets } = await query<{
      id: string;
      reference: string;
      subject: string;
      sla_due_at: Date;
    }>(
      `SELECT id, reference, subject, sla_due_at FROM support_tickets
       WHERE sla_due_at IS NOT NULL
         AND sla_due_at >= $1 AND sla_due_at <= $2
         AND status NOT IN ('resolved', 'closed')`,
      [from, to],
    );

    for (const row of tickets) {
      items.push({
        id: `ticket-${row.id}`,
        title: `SLA — ${row.subject}`,
        description: row.reference,
        type: "ticket_sla",
        source: "ticket",
        sourceId: row.id,
        startsAt: row.sla_due_at.toISOString(),
        endsAt: null,
        allDay: false,
        assignee: null,
        linkHref: "/admin/crm/tickets",
      });
    }

    return items.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  });
}

export async function createCalendarEvent(
  input: z.infer<typeof createEventSchema>,
): Promise<CalendarEvent> {
  return withDb(async (query) => {
    const allDay = input.allDay ?? false;
    const startsAt = parseStartsAt(input.startsAt, allDay);
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    const metadata = {
      meetingPlatform: input.meetingPlatform ?? "none",
      meetingUrl: input.meetingUrl ?? null,
    };

    const { rows } = await query<EventRow>(
      `INSERT INTO calendar_events (
        title, description, type, starts_at, ends_at, all_day,
        assignee, client_id, project_id, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        input.title,
        input.description ?? null,
        input.type ?? "meeting",
        startsAt,
        endsAt,
        allDay,
        input.assignee ?? null,
        input.clientId ?? null,
        input.projectId ?? null,
        JSON.stringify(metadata),
      ],
    );

    return mapEvent(rows[0]);
  });
}

export async function getCalendarEventById(id: string): Promise<CalendarEvent | null> {
  return withDb(async (query) => {
    const { rows } = await query<EventRow>(`SELECT * FROM calendar_events WHERE id = $1`, [id]);
    return rows[0] ? mapEvent(rows[0]) : null;
  });
}

export async function updateCalendarEvent(
  id: string,
  input: z.infer<typeof updateEventSchema>,
): Promise<CalendarEvent | null> {
  return withDb(async (query) => {
    const { rows: existingRows } = await query<EventRow>(
      `SELECT * FROM calendar_events WHERE id = $1`,
      [id],
    );
    const existing = existingRows[0];
    if (!existing) return null;

    const allDay = input.allDay ?? existing.all_day;
    const startsAt = input.startsAt
      ? parseStartsAt(input.startsAt, allDay)
      : existing.starts_at;
    const endsAt =
      input.endsAt !== undefined
        ? input.endsAt
          ? new Date(input.endsAt)
          : null
        : existing.ends_at;

    const existingMeta = existing.metadata ?? {};
    const metadata = {
      ...existingMeta,
      ...(input.meetingPlatform !== undefined
        ? { meetingPlatform: input.meetingPlatform ?? "none" }
        : {}),
      ...(input.meetingUrl !== undefined ? { meetingUrl: input.meetingUrl } : {}),
    };

    const { rows } = await query<EventRow>(
      `UPDATE calendar_events SET
        title = $2,
        description = $3,
        type = $4,
        starts_at = $5,
        ends_at = $6,
        all_day = $7,
        assignee = $8,
        client_id = $9,
        project_id = $10,
        metadata = $11::jsonb,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        input.title ?? existing.title,
        input.description !== undefined ? input.description : existing.description,
        input.type ?? existing.type,
        startsAt,
        endsAt,
        allDay,
        input.assignee !== undefined ? input.assignee : existing.assignee,
        input.clientId !== undefined ? input.clientId : existing.client_id,
        input.projectId !== undefined ? input.projectId : existing.project_id,
        JSON.stringify(metadata),
      ],
    );

    return mapEvent(rows[0]);
  });
}

export async function deleteCalendarEvent(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM calendar_events WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

/** Prochain événement calendrier lié à un projet (réunion, etc.). */
export async function getNextProjectCalendarEvent(projectId: string): Promise<CalendarEvent | null> {
  return withDb(async (query) => {
    const { rows } = await query<EventRow>(
      `SELECT * FROM calendar_events
       WHERE project_id = $1 AND starts_at >= NOW()
       ORDER BY starts_at ASC
       LIMIT 1`,
      [projectId],
    );
    return rows[0] ? mapEvent(rows[0]) : null;
  });
}
