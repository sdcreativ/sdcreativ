import { z } from "zod";
import { withDb } from "@/lib/db";
import type { TaskPriority, TaskStatus } from "@/content/tasks-labels";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/content/tasks-labels";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: string | null;
  projectId: string | null;
  projectName: string | null;
  clientId: string | null;
  clientName: string | null;
  leadId: string | null;
  metadata: Record<string, unknown>;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: Date | null;
  assignee: string | null;
  assignee_id: string | null;
  project_id: string | null;
  project_name: string | null;
  client_id: string | null;
  client_name: string | null;
  lead_id: string | null;
  metadata: Record<string, unknown> | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const taskSelect = `
  SELECT t.*,
    p.name AS project_name,
    COALESCE(c.company, c.name) AS client_name
  FROM tasks t
  LEFT JOIN projects p ON p.id = t.project_id
  LEFT JOIN clients c ON c.id = t.client_id
`;

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date ? row.due_date.toISOString().slice(0, 10) : null,
    assignee: row.assignee,
    projectId: row.project_id,
    projectName: row.project_name,
    clientId: row.client_id,
    clientName: row.client_name,
    leadId: row.lead_id,
    metadata: row.metadata ?? {},
    completedAt: row.completed_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(TASK_STATUSES).default("todo"),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  assignee: z.string().trim().max(100).optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export type TaskListFilters = {
  status?: TaskStatus;
  assignee?: string;
  projectId?: string;
  q?: string;
};

export async function listTasks(filters?: TaskListFilters): Promise<Task[]> {
  return withDb(async (query) => {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters?.status) {
      params.push(filters.status);
      conditions.push(`t.status = $${params.length}`);
    }
    if (filters?.assignee) {
      params.push(filters.assignee);
      conditions.push(`t.assignee = $${params.length}`);
    }
    if (filters?.projectId) {
      params.push(filters.projectId);
      conditions.push(`t.project_id = $${params.length}`);
    }
    if (filters?.q?.trim()) {
      const pattern = `%${filters.q.trim().replace(/[%_\\]/g, "\\$&")}%`;
      params.push(pattern);
      const n = params.length;
      conditions.push(`(
        t.title ILIKE $${n}
        OR t.description ILIKE $${n}
        OR t.assignee ILIKE $${n}
        OR p.name ILIKE $${n}
        OR COALESCE(c.company, c.name) ILIKE $${n}
      )`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await query<TaskRow>(
      `${taskSelect} ${where} ORDER BY
        CASE t.status WHEN 'todo' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
        t.due_date ASC NULLS LAST,
        t.updated_at DESC`,
      params,
    );

    return rows.map(mapTask);
  });
}

export async function getTaskById(id: string): Promise<Task | null> {
  return withDb(async (query) => {
    const { rows } = await query<TaskRow>(`${taskSelect} WHERE t.id = $1`, [id]);
    return rows[0] ? mapTask(rows[0]) : null;
  });
}

export async function createTask(
  input: z.infer<typeof createTaskSchema>,
): Promise<Task> {
  return withDb(async (query) => {
    const status = input.status ?? "todo";
    const completedAt = status === "done" ? new Date() : null;
    const { resolveAssigneeInput } = await import("@/lib/crm-assignee");
    const assigneeFields = await resolveAssigneeInput({
      assigneeId: input.assigneeId,
      assignee: input.assignee,
    });

    const { rows } = await query<{ id: string }>(
      `INSERT INTO tasks (
        title, description, status, priority, due_date, assignee, assignee_id,
        project_id, client_id, lead_id, metadata, completed_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id`,
      [
        input.title,
        input.description ?? null,
        status,
        input.priority ?? "medium",
        input.dueDate ?? null,
        assigneeFields.assignee,
        assigneeFields.assigneeId,
        input.projectId ?? null,
        input.clientId ?? null,
        input.leadId ?? null,
        JSON.stringify(input.metadata ?? {}),
        completedAt,
      ],
    );

    const full = await getTaskById(rows[0].id);
    return full!;
  });
}

export async function updateTask(
  id: string,
  input: z.infer<typeof updateTaskSchema>,
): Promise<Task | null> {
  return withDb(async (query) => {
    const { rows: existingRows } = await query<TaskRow>(
      `SELECT * FROM tasks WHERE id = $1`,
      [id],
    );
    const existing = existingRows[0];
    if (!existing) return null;

    const nextStatus = input.status ?? existing.status;
    let completedAt = existing.completed_at;
    if (nextStatus === "done" && existing.status !== "done") {
      completedAt = new Date();
    } else if (nextStatus !== "done") {
      completedAt = null;
    }

    let nextAssignee = existing.assignee;
    let nextAssigneeId = existing.assignee_id ?? null;
    if (input.assigneeId !== undefined || input.assignee !== undefined) {
      const { resolveAssigneeInput } = await import("@/lib/crm-assignee");
      const resolved = await resolveAssigneeInput({
        assigneeId: input.assigneeId,
        assignee: input.assignee,
      });
      nextAssignee = resolved.assignee;
      nextAssigneeId = resolved.assigneeId;
    }

    await query(
      `UPDATE tasks SET
        title = $2,
        description = $3,
        status = $4,
        priority = $5,
        due_date = $6,
        assignee = $7,
        assignee_id = $8,
        project_id = $9,
        client_id = $10,
        lead_id = $11,
        metadata = $12::jsonb,
        completed_at = $13,
        updated_at = NOW()
      WHERE id = $1`,
      [
        id,
        input.title ?? existing.title,
        input.description !== undefined ? input.description : existing.description,
        nextStatus,
        input.priority ?? existing.priority,
        input.dueDate !== undefined ? input.dueDate : existing.due_date,
        nextAssignee,
        nextAssigneeId,
        input.projectId !== undefined ? input.projectId : existing.project_id,
        input.clientId !== undefined ? input.clientId : existing.client_id,
        input.leadId !== undefined ? input.leadId : existing.lead_id,
        JSON.stringify(
          input.metadata
            ? { ...(existing.metadata ?? {}), ...input.metadata }
            : existing.metadata ?? {},
        ),
        completedAt,
      ],
    );

    return getTaskById(id);
  });
}

export async function deleteTask(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM tasks WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function getTaskStats(): Promise<{
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
}> {
  return withDb(async (query) => {
    const { rows } = await query<{ status: TaskStatus; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM tasks GROUP BY status`,
    );

    const counts = { todo: 0, in_progress: 0, done: 0 };
    for (const row of rows) {
      counts[row.status] = Number(row.count);
    }

    const { rows: overdueRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM tasks
       WHERE due_date < CURRENT_DATE AND status != 'done'`,
    );

    const total = counts.todo + counts.in_progress + counts.done;

    return {
      total,
      todo: counts.todo,
      inProgress: counts.in_progress,
      done: counts.done,
      overdue: Number(overdueRows[0]?.count ?? 0),
    };
  });
}
