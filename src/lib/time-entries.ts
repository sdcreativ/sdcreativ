import { z } from "zod";
import { withDb } from "@/lib/db";

export type TimeEntry = {
  id: string;
  projectId: string;
  projectName: string | null;
  taskId: string | null;
  taskTitle: string | null;
  userId: string | null;
  userName: string | null;
  description: string | null;
  hours: number;
  billable: boolean;
  soldHours: number | null;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectTimeSummary = {
  projectId: string;
  projectName: string;
  loggedHours: number;
  billableHours: number;
  soldHours: number;
  profitability: number | null;
};

type TimeEntryRow = {
  id: string;
  project_id: string;
  project_name: string | null;
  task_id: string | null;
  task_title: string | null;
  user_id: string | null;
  user_name: string | null;
  description: string | null;
  hours: string | number;
  billable: boolean;
  sold_hours: string | number | null;
  entry_date: Date;
  created_at: Date;
  updated_at: Date;
};

const select = `
  SELECT te.*, p.name AS project_name, t.title AS task_title
  FROM time_entries te
  LEFT JOIN projects p ON p.id = te.project_id
  LEFT JOIN tasks t ON t.id = te.task_id
`;

function mapTimeEntry(row: TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    taskId: row.task_id,
    taskTitle: row.task_title,
    userId: row.user_id,
    userName: row.user_name,
    description: row.description,
    hours: Number(row.hours),
    billable: row.billable,
    soldHours: row.sold_hours != null ? Number(row.sold_hours) : null,
    entryDate: row.entry_date.toISOString().slice(0, 10),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const createTimeEntrySchema = z.object({
  projectId: z.string().uuid(),
  taskId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
  userName: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  hours: z.number().min(0.25).max(24),
  billable: z.boolean().optional(),
  soldHours: z.number().min(0).optional().nullable(),
  entryDate: z.string().optional(),
});

export const updateTimeEntrySchema = createTimeEntrySchema.partial().omit({ projectId: true });

export async function listTimeEntries(filters?: {
  projectId?: string;
  userId?: string;
  from?: string;
  to?: string;
}): Promise<TimeEntry[]> {
  return withDb(async (query) => {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters?.projectId) {
      params.push(filters.projectId);
      clauses.push(`te.project_id = $${params.length}`);
    }
    if (filters?.userId) {
      params.push(filters.userId);
      clauses.push(`te.user_id = $${params.length}`);
    }
    if (filters?.from) {
      params.push(filters.from);
      clauses.push(`te.entry_date >= $${params.length}`);
    }
    if (filters?.to) {
      params.push(filters.to);
      clauses.push(`te.entry_date <= $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await query<TimeEntryRow>(
      `${select} ${where} ORDER BY te.entry_date DESC, te.created_at DESC`,
      params,
    );
    return rows.map(mapTimeEntry);
  });
}

export async function getTimeEntryById(id: string): Promise<TimeEntry | null> {
  return withDb(async (query) => {
    const { rows } = await query<TimeEntryRow>(`${select} WHERE te.id = $1`, [id]);
    return rows[0] ? mapTimeEntry(rows[0]) : null;
  });
}

export async function createTimeEntry(
  input: z.infer<typeof createTimeEntrySchema>,
): Promise<TimeEntry> {
  return withDb(async (query) => {
    const { rows } = await query<TimeEntryRow>(
      `INSERT INTO time_entries (
        project_id, task_id, user_id, user_name, description,
        hours, billable, sold_hours, entry_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        input.projectId,
        input.taskId ?? null,
        input.userId ?? null,
        input.userName ?? null,
        input.description ?? null,
        input.hours,
        input.billable ?? true,
        input.soldHours ?? null,
        input.entryDate ?? new Date().toISOString().slice(0, 10),
      ],
    );
    const { rows: full } = await query<TimeEntryRow>(`${select} WHERE te.id = $1`, [rows[0]!.id]);
    return mapTimeEntry(full[0]!);
  });
}

export async function updateTimeEntry(
  id: string,
  input: z.infer<typeof updateTimeEntrySchema>,
): Promise<TimeEntry | null> {
  return withDb(async (query) => {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (input.taskId !== undefined) {
      params.push(input.taskId);
      sets.push(`task_id = $${params.length}`);
    }
    if (input.userId !== undefined) {
      params.push(input.userId);
      sets.push(`user_id = $${params.length}`);
    }
    if (input.userName !== undefined) {
      params.push(input.userName);
      sets.push(`user_name = $${params.length}`);
    }
    if (input.description !== undefined) {
      params.push(input.description);
      sets.push(`description = $${params.length}`);
    }
    if (input.hours !== undefined) {
      params.push(input.hours);
      sets.push(`hours = $${params.length}`);
    }
    if (input.billable !== undefined) {
      params.push(input.billable);
      sets.push(`billable = $${params.length}`);
    }
    if (input.soldHours !== undefined) {
      params.push(input.soldHours);
      sets.push(`sold_hours = $${params.length}`);
    }
    if (input.entryDate !== undefined) {
      params.push(input.entryDate);
      sets.push(`entry_date = $${params.length}`);
    }

    if (sets.length === 0) return getTimeEntryById(id);

    params.push(id);
    await query(
      `UPDATE time_entries SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${params.length}`,
      params,
    );
    return getTimeEntryById(id);
  });
}

export async function deleteTimeEntry(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM time_entries WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function getProjectTimeSummaries(): Promise<ProjectTimeSummary[]> {
  return withDb(async (query) => {
    const { rows } = await query<{
      project_id: string;
      project_name: string;
      logged_hours: string;
      billable_hours: string;
      sold_hours: string;
    }>(`
      SELECT
        p.id AS project_id,
        p.name AS project_name,
        COALESCE(SUM(te.hours), 0)::text AS logged_hours,
        COALESCE(SUM(te.hours) FILTER (WHERE te.billable), 0)::text AS billable_hours,
        COALESCE(MAX(te.sold_hours), 0)::text AS sold_hours
      FROM projects p
      LEFT JOIN time_entries te ON te.project_id = p.id
      WHERE p.status NOT IN ('cancelled')
      GROUP BY p.id, p.name
      HAVING COALESCE(SUM(te.hours), 0) > 0 OR MAX(te.sold_hours) IS NOT NULL
      ORDER BY p.name
    `);

    return rows.map((row) => {
      const logged = Number(row.logged_hours);
      const sold = Number(row.sold_hours);
      const profitability = sold > 0 ? Math.round((sold / logged) * 100) : null;
      return {
        projectId: row.project_id,
        projectName: row.project_name,
        loggedHours: logged,
        billableHours: Number(row.billable_hours),
        soldHours: sold,
        profitability,
      };
    });
  });
}
