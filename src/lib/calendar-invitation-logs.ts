import { withDb } from "@/lib/db";

export type InvitationLogChannel = "email" | "whatsapp";
export type InvitationLogStatus = "sent" | "failed";

export type CalendarInvitationLog = {
  id: string;
  eventId: string;
  email: string;
  channel: InvitationLogChannel;
  status: InvitationLogStatus;
  error: string | null;
  sentAt: string;
};

type LogRow = {
  id: string;
  event_id: string;
  email: string;
  channel: string;
  status: string;
  error: string | null;
  sent_at: Date;
};

let tableReady: Promise<void> | null = null;

export async function ensureCalendarInvitationLogsTable(): Promise<void> {
  if (!tableReady) {
    tableReady = withDb(async (query) => {
      await query(`
        CREATE TABLE IF NOT EXISTS calendar_invitation_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          channel VARCHAR(20) NOT NULL DEFAULT 'email',
          status VARCHAR(20) NOT NULL,
          error TEXT,
          sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_calendar_invitation_logs_event
          ON calendar_invitation_logs (event_id, sent_at DESC)
      `);
    }).catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  await tableReady;
}

function mapRow(row: LogRow): CalendarInvitationLog {
  return {
    id: row.id,
    eventId: row.event_id,
    email: row.email,
    channel: row.channel === "whatsapp" ? "whatsapp" : "email",
    status: row.status === "sent" ? "sent" : "failed",
    error: row.error,
    sentAt: row.sent_at.toISOString(),
  };
}

export async function logCalendarInvitation(input: {
  eventId: string;
  email: string;
  channel: InvitationLogChannel;
  status: InvitationLogStatus;
  error?: string | null;
}): Promise<void> {
  await ensureCalendarInvitationLogsTable();
  await withDb(async (query) => {
    await query(
      `INSERT INTO calendar_invitation_logs (event_id, email, channel, status, error)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        input.eventId,
        input.email.trim().toLowerCase(),
        input.channel,
        input.status,
        input.error?.slice(0, 1000) ?? null,
      ],
    );
  });
}

export async function listCalendarInvitationLogs(
  eventId: string,
  limit = 50,
): Promise<CalendarInvitationLog[]> {
  await ensureCalendarInvitationLogsTable();
  return withDb(async (query) => {
    const { rows } = await query<LogRow>(
      `SELECT * FROM calendar_invitation_logs
       WHERE event_id = $1
       ORDER BY sent_at DESC
       LIMIT $2`,
      [eventId, Math.min(Math.max(limit, 1), 100)],
    );
    return rows.map(mapRow);
  });
}
