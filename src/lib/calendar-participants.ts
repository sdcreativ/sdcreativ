import { z } from "zod";
import { withDb } from "@/lib/db";

export type CalendarParticipant = {
  id: string;
  eventId: string;
  email: string;
  name: string | null;
  status: "pending" | "accepted" | "declined";
  invitedAt: string;
};

type ParticipantRow = {
  id: string;
  event_id: string;
  email: string;
  name: string | null;
  status: "pending" | "accepted" | "declined";
  invited_at: Date;
};

function mapParticipant(row: ParticipantRow): CalendarParticipant {
  return {
    id: row.id,
    eventId: row.event_id,
    email: row.email,
    name: row.name,
    status: row.status,
    invitedAt: row.invited_at.toISOString(),
  };
}

export const participantSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().max(160).optional().nullable(),
});

export async function listEventParticipants(eventId: string): Promise<CalendarParticipant[]> {
  return withDb(async (query) => {
    const { rows } = await query<ParticipantRow>(
      `SELECT * FROM calendar_event_participants WHERE event_id = $1 ORDER BY invited_at ASC`,
      [eventId],
    );
    return rows.map(mapParticipant);
  });
}

export async function syncEventParticipants(
  eventId: string,
  participants: z.infer<typeof participantSchema>[],
): Promise<{ participants: CalendarParticipant[]; newEmails: string[] }> {
  return withDb(async (query) => {
    const { rows: existingRows } = await query<ParticipantRow>(
      `SELECT * FROM calendar_event_participants WHERE event_id = $1`,
      [eventId],
    );
    const existingEmails = new Set(existingRows.map((r) => r.email.toLowerCase()));
    const incomingEmails = new Set(participants.map((p) => p.email.toLowerCase()));

    for (const row of existingRows) {
      if (!incomingEmails.has(row.email.toLowerCase())) {
        await query(`DELETE FROM calendar_event_participants WHERE id = $1`, [row.id]);
      }
    }

    const newEmails: string[] = [];
    for (const p of participants) {
      if (!existingEmails.has(p.email.toLowerCase())) {
        await query(
          `INSERT INTO calendar_event_participants (event_id, email, name) VALUES ($1, $2, $3)`,
          [eventId, p.email.toLowerCase(), p.name ?? null],
        );
        newEmails.push(p.email);
      }
    }

    const list = await listEventParticipants(eventId);
    return { participants: list, newEmails };
  });
}
