import { withDb } from "@/lib/db";

export async function getCrmUserById(id: string): Promise<{ id: string; name: string; email: string } | null> {
  return withDb(async (query) => {
    const { rows } = await query<{ id: string; name: string; email: string }>(
      `SELECT id, name, email FROM crm_users WHERE id = $1 AND active = true`,
      [id],
    );
    return rows[0] ?? null;
  });
}

export async function resolveAssigneeFields(
  assigneeId: string | null | undefined,
): Promise<{ assigneeId: string | null; assignee: string | null }> {
  if (!assigneeId) return { assigneeId: null, assignee: null };
  const user = await getCrmUserById(assigneeId);
  if (!user) return { assigneeId: null, assignee: null };
  return { assigneeId: user.id, assignee: user.name };
}

export async function listActiveCrmUsers(): Promise<
  Array<{ id: string; name: string; email: string; role: string }>
> {
  return withDb(async (query) => {
    const { rows } = await query<{ id: string; name: string; email: string; role: string }>(
      `SELECT id, name, email, role FROM crm_users WHERE active = true ORDER BY name ASC`,
    );
    return rows;
  });
}
