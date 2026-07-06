import { withDb } from "@/lib/db";

export const LEAD_ACTIVITY_TYPES = [
  "created",
  "note",
  "status_change",
  "assignee_change",
  "email_sent",
] as const;

export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number];

export type LeadActivity = {
  id: string;
  leadId: string;
  type: LeadActivityType;
  subject: string | null;
  content: string;
  actorName: string | null;
  createdAt: string;
};

type ActivityRow = {
  id: string;
  lead_id: string;
  type: LeadActivityType;
  subject: string | null;
  content: string;
  actor_name: string | null;
  created_at: Date;
};

function mapActivity(row: ActivityRow): LeadActivity {
  return {
    id: row.id,
    leadId: row.lead_id,
    type: row.type,
    subject: row.subject,
    content: row.content,
    actorName: row.actor_name,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listLeadActivities(leadId: string): Promise<LeadActivity[]> {
  return withDb(async (query) => {
    const { rows } = await query<ActivityRow>(
      `SELECT * FROM lead_activities WHERE lead_id = $1 ORDER BY created_at DESC`,
      [leadId],
    );
    return rows.map(mapActivity);
  });
}

export async function createLeadActivity(input: {
  leadId: string;
  type: LeadActivityType;
  content: string;
  subject?: string | null;
  actorName?: string | null;
}): Promise<LeadActivity> {
  return withDb(async (query) => {
    const { rows } = await query<ActivityRow>(
      `INSERT INTO lead_activities (lead_id, type, subject, content, actor_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        input.leadId,
        input.type,
        input.subject ?? null,
        input.content,
        input.actorName ?? null,
      ],
    );
    return mapActivity(rows[0]!);
  });
}
