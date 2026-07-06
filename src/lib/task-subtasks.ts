import { z } from "zod";
import { withDb } from "@/lib/db";

export type TaskSubtask = {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  sortOrder: number;
  createdAt: string;
};

type SubtaskRow = {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  sort_order: number;
  created_at: Date;
};

function mapSubtask(row: SubtaskRow): TaskSubtask {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    done: row.done,
    sortOrder: row.sort_order,
    createdAt: row.created_at.toISOString(),
  };
}

export const createSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export const updateSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  done: z.boolean().optional(),
});

export async function listTaskSubtasks(taskId: string): Promise<TaskSubtask[]> {
  return withDb(async (query) => {
    const { rows } = await query<SubtaskRow>(
      `SELECT * FROM task_subtasks WHERE task_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [taskId],
    );
    return rows.map(mapSubtask);
  });
}

export async function createTaskSubtask(
  taskId: string,
  input: z.infer<typeof createSubtaskSchema>,
): Promise<TaskSubtask> {
  return withDb(async (query) => {
    const { rows: orderRows } = await query<{ max: number | null }>(
      `SELECT MAX(sort_order) AS max FROM task_subtasks WHERE task_id = $1`,
      [taskId],
    );
    const sortOrder = (orderRows[0]?.max ?? -1) + 1;

    const { rows } = await query<SubtaskRow>(
      `INSERT INTO task_subtasks (task_id, title, sort_order) VALUES ($1, $2, $3) RETURNING *`,
      [taskId, input.title, sortOrder],
    );
    return mapSubtask(rows[0]!);
  });
}

export async function updateTaskSubtask(
  id: string,
  input: z.infer<typeof updateSubtaskSchema>,
): Promise<TaskSubtask | null> {
  return withDb(async (query) => {
    const { rows: existingRows } = await query<SubtaskRow>(
      `SELECT * FROM task_subtasks WHERE id = $1`,
      [id],
    );
    const existing = existingRows[0];
    if (!existing) return null;

    const { rows } = await query<SubtaskRow>(
      `UPDATE task_subtasks SET
        title = $2,
        done = $3
       WHERE id = $1
       RETURNING *`,
      [
        id,
        input.title ?? existing.title,
        input.done ?? existing.done,
      ],
    );
    return rows[0] ? mapSubtask(rows[0]) : null;
  });
}

export async function deleteTaskSubtask(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM task_subtasks WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}
