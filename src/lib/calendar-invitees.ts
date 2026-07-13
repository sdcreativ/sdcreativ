import { withDb } from "@/lib/db";

export type CalendarInvitee = {
  id: string;
  source: "team" | "client";
  name: string;
  email: string;
  phone: string | null;
  subtitle: string | null;
};

export async function listCalendarInvitees(): Promise<CalendarInvitee[]> {
  return withDb(async (query) => {
    const invitees: CalendarInvitee[] = [];

    const { rows: teamRows } = await query<{
      id: string;
      name: string;
      email: string;
      role: string;
    }>(
      `SELECT id, name, email, role FROM crm_users WHERE active = true ORDER BY name ASC`,
    );

    for (const row of teamRows) {
      invitees.push({
        id: row.id,
        source: "team",
        name: row.name,
        email: row.email.toLowerCase(),
        phone: null,
        subtitle: row.role,
      });
    }

    const { rows: clientRows } = await query<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      company: string | null;
    }>(
      `SELECT id, name, email, phone, company FROM clients
       WHERE status = 'active' AND email IS NOT NULL AND TRIM(email) != ''
       ORDER BY COALESCE(company, name) ASC`,
    );

    for (const row of clientRows) {
      invitees.push({
        id: row.id,
        source: "client",
        name: row.name,
        email: row.email.toLowerCase(),
        phone: row.phone,
        subtitle: row.company,
      });
    }

    return invitees;
  });
}

export function inviteeKey(invitee: Pick<CalendarInvitee, "source" | "id">): string {
  return `${invitee.source}:${invitee.id}`;
}
