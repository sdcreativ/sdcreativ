import { z } from "zod";
import { withDb } from "@/lib/db";

export type CalendarParticipant = {
  id: string;
  eventId: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: "pending" | "accepted" | "declined";
  invitedAt: string;
};

type ParticipantRow = {
  id: string;
  event_id: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: "pending" | "accepted" | "declined";
  invited_at: Date;
};

function mapParticipant(row: ParticipantRow): CalendarParticipant {
  return {
    id: row.id,
    eventId: row.event_id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    status: row.status,
    invitedAt: row.invited_at.toISOString(),
  };
}

export const participantSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().max(160).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
});

export type ParticipantInput = z.infer<typeof participantSchema>;

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
  participants: ParticipantInput[],
): Promise<{ participants: CalendarParticipant[]; newParticipants: ParticipantInput[] }> {
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
