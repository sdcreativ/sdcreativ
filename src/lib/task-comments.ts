import { z } from "zod";
import { withDb } from "@/lib/db";

export type TaskComment = {
  id: string;
  taskId: string;
  content: string;
  actorName: string | null;
  createdAt: string;
};

type CommentRow = {
  id: string;
  task_id: string;
  content: string;
  actor_name: string | null;
  created_at: Date;
};

function mapComment(row: CommentRow): TaskComment {
  return {
    id: row.id,
    taskId: row.task_id,
    content: row.content,
    actorName: row.actor_name,
    createdAt: row.created_at.toISOString(),
  };
}

export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  actorName: z.string().trim().max(100).optional().nullable(),
});

export async function listTaskComments(taskId: string): Promise<TaskComment[]> {
  return withDb(async (query) => {
    const { rows } = await query<CommentRow>(
      `SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at DESC`,
      [taskId],
    );
    return rows.map(mapComment);
  });
}

export async function createTaskComment(
  taskId: string,
  input: z.infer<typeof createCommentSchema>,
): Promise<TaskComment> {
  return withDb(async (query) => {
    const { rows } = await query<CommentRow>(
      `INSERT INTO task_comments (task_id, content, actor_name) VALUES ($1, $2, $3) RETURNING *`,
      [taskId, input.content, input.actorName ?? null],
    );
    return mapComment(rows[0]!);
  });
}

export async function deleteTaskComment(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM task_comments WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}
