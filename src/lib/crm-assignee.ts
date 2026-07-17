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

/** Préfère assigneeId ; sinon résout le nom legacy vers un utilisateur actif. */
export async function resolveAssigneeInput(input: {
  assigneeId?: string | null;
  assignee?: string | null;
}): Promise<{ assigneeId: string | null; assignee: string | null }> {
  if (input.assigneeId !== undefined) {
    return resolveAssigneeFields(input.assigneeId);
  }
  if (input.assignee === null) return { assigneeId: null, assignee: null };
  if (!input.assignee?.trim()) return { assigneeId: null, assignee: null };
  return withDb(async (query) => {
    const { rows } = await query<{ id: string; name: string }>(
      `SELECT id, name FROM crm_users WHERE active = true AND name = $1 LIMIT 1`,
      [input.assignee!.trim()],
    );
    if (rows[0]) return { assigneeId: rows[0].id, assignee: rows[0].name };
    return { assigneeId: null, assignee: input.assignee!.trim() };
  });
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
