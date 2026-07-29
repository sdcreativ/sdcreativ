import { withDb } from "@/lib/db";
import type {
  CalendarInvitationLog,
  InvitationLogChannel,
  InvitationLogStatus,
} from "@/lib/calendar-invitation-logs-shared";

export {
  INVITATION_LOG_STATUS_LABELS,
  type CalendarInvitationLog,
  type InvitationLogChannel,
  type InvitationLogStatus,
} from "@/lib/calendar-invitation-logs-shared";

type LogRow = {
  id: string;
  event_id: string;
  email: string;
  channel: string;
  status: string;
  error: string | null;
  provider_message_id?: string | null;
  sent_at: Date;
};

let tableReady: Promise<void> | null = null;

function normalizeStatus(raw: string): InvitationLogStatus {
  if (
    raw === "sent" ||
    raw === "failed" ||
    raw === "delivered" ||
    raw === "bounced" ||
    raw === "complained"
  ) {
    return raw;
  }
  return "failed";
}

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
          provider_message_id VARCHAR(120),
          sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await query(`
        ALTER TABLE calendar_invitation_logs
          ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(120)
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_calendar_invitation_logs_event
          ON calendar_invitation_logs (event_id, sent_at DESC)
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_calendar_invitation_logs_provider_msg
          ON calendar_invitation_logs (provider_message_id)
          WHERE provider_message_id IS NOT NULL
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
    status: normalizeStatus(row.status),
    error: row.error,
    providerMessageId: row.provider_message_id ?? null,
    sentAt: row.sent_at.toISOString(),
  };
}

export async function logCalendarInvitation(input: {
  eventId: string;
  email: string;
  channel: InvitationLogChannel;
  status: InvitationLogStatus;
  error?: string | null;
  providerMessageId?: string | null;
}): Promise<void> {
  await ensureCalendarInvitationLogsTable();
  await withDb(async (query) => {
    await query(
      `INSERT INTO calendar_invitation_logs (
        event_id, email, channel, status, error, provider_message_id
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        input.eventId,
        input.email.trim().toLowerCase(),
        input.channel,
        input.status,
        input.error?.slice(0, 1000) ?? null,
        input.providerMessageId?.trim() || null,
      ],
    );
  });
}

export async function updateInvitationLogByProviderMessageId(input: {
  providerMessageId: string;
  status: Exclude<InvitationLogStatus, "sent" | "failed">;
  error?: string | null;
}): Promise<CalendarInvitationLog | null> {
  await ensureCalendarInvitationLogsTable();
  return withDb(async (query) => {
    const { rows } = await query<LogRow>(
      `UPDATE calendar_invitation_logs
       SET status = $2,
           error = COALESCE($3, error)
       WHERE provider_message_id = $1
         AND channel = 'email'
       RETURNING *`,
      [
        input.providerMessageId.trim(),
        input.status,
        input.error?.slice(0, 1000) ?? null,
      ],
    );
    return rows[0] ? mapRow(rows[0]) : null;
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
