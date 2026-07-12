import { withDb } from "@/lib/db";

export type InboxItemType =
  | "ticket"
  | "lead_activity"
  | "portal_message"
  | "task_comment";

export type InboxItem = {
  key: string;
  type: InboxItemType;
  title: string;
  preview: string;
  href: string;
  assigneeId: string | null;
  assigneeName: string | null;
  clientName: string | null;
  createdAt: string;
  read: boolean;
};

export type InboxFilters = {
  type?: InboxItemType;
  assigneeId?: string;
  unreadOnly?: boolean;
};

export async function listInboxItems(
  userId: string,
  filters?: InboxFilters,
  limit = 80,
): Promise<InboxItem[]> {
  return withDb(async (query) => {
    const { rows: readRows } = await query<{ item_key: string }>(
      `SELECT item_key FROM crm_inbox_reads WHERE user_id = $1`,
      [userId],
    );
    const readKeys = new Set(readRows.map((r) => r.item_key));

    const items: InboxItem[] = [];

    const { rows: tickets } = await query<{
      id: string;
      reference: string;
      subject: string;
      client_name: string;
      assignee_id: string | null;
      assignee: string | null;
      created_at: Date;
      message_count: string;
    }>(`
      SELECT st.id, st.reference, st.subject, st.client_name,
             st.assignee_id, st.assignee, st.created_at,
             COUNT(tm.id)::text AS message_count
      FROM support_tickets st
      LEFT JOIN ticket_messages tm ON tm.ticket_id = st.id
      WHERE st.status NOT IN ('resolved', 'closed')
      GROUP BY st.id
      ORDER BY st.updated_at DESC
      LIMIT 30
    `);

    for (const t of tickets) {
      items.push({
        key: `ticket:${t.id}`,
        type: "ticket",
        title: `${t.reference} — ${t.subject}`,
        preview: `${t.message_count} message(s)`,
        href: `/admin/crm/tickets?highlight=${t.id}`,
        assigneeId: t.assignee_id,
        assigneeName: t.assignee,
        clientName: t.client_name,
        createdAt: t.created_at.toISOString(),
        read: readKeys.has(`ticket:${t.id}`),
      });
    }

    const { rows: leads } = await query<{
      id: string;
      subject: string | null;
      content: string;
      actor_name: string | null;
      created_at: Date;
      lead_id: string;
      lead_name: string;
      assignee_id: string | null;
    }>(`
      SELECT la.id, la.subject, la.content, la.actor_name, la.created_at,
             la.lead_id, l.name AS lead_name, l.assignee_id
      FROM lead_activities la
      INNER JOIN leads l ON l.id = la.lead_id
      WHERE la.type IN ('email_sent', 'note')
      ORDER BY la.created_at DESC
      LIMIT 25
    `);

    for (const a of leads) {
      items.push({
        key: `lead_activity:${a.id}`,
        type: "lead_activity",
        title: a.subject ?? `Activité — ${a.lead_name}`,
        preview: a.content.slice(0, 120),
        href: `/admin/crm/leads?highlight=${a.lead_id}`,
        assigneeId: a.assignee_id,
        assigneeName: a.actor_name,
        clientName: a.lead_name,
        createdAt: a.created_at.toISOString(),
        read: readKeys.has(`lead_activity:${a.id}`),
      });
    }

    const { rows: comments } = await query<{
      id: string;
      content: string;
      actor_name: string | null;
      created_at: Date;
      task_id: string;
      task_title: string;
      project_name: string | null;
      assignee_id: string | null;
    }>(`
      SELECT tc.id, tc.content, tc.actor_name, tc.created_at,
             tc.task_id, t.title AS task_title, p.name AS project_name, t.assignee_id
      FROM task_comments tc
      INNER JOIN tasks t ON t.id = tc.task_id
      LEFT JOIN projects p ON p.id = t.project_id
      ORDER BY tc.created_at DESC
      LIMIT 25
    `);

    for (const c of comments) {
      items.push({
        key: `task_comment:${c.id}`,
        type: "task_comment",
        title: `Commentaire — ${c.task_title}`,
        preview: c.content.slice(0, 120),
        href: `/admin/crm/taches?highlight=${c.task_id}`,
        assigneeId: c.assignee_id,
        assigneeName: c.actor_name,
        clientName: c.project_name,
        createdAt: c.created_at.toISOString(),
        read: readKeys.has(`task_comment:${c.id}`),
      });
    }

    const { rows: portalMsgs } = await query<{
      id: string;
      subject: string;
      client_name: string;
      created_at: Date;
      assignee_id: string | null;
      assignee: string | null;
      content: string;
    }>(`
      SELECT st.id, st.subject, st.client_name, st.created_at,
             st.assignee_id, st.assignee, tm.content
      FROM ticket_messages tm
      INNER JOIN support_tickets st ON st.id = tm.ticket_id
      WHERE tm.author_type = 'client'
        AND st.status NOT IN ('resolved', 'closed')
      ORDER BY tm.created_at DESC
      LIMIT 25
    `);

    for (const m of portalMsgs) {
      items.push({
        key: `portal_message:${m.id}`,
        type: "portal_message",
        title: `Portail — ${m.subject}`,
        preview: m.content.slice(0, 120),
        href: `/admin/crm/tickets?highlight=${m.id}`,
        assigneeId: m.assignee_id,
        assigneeName: m.assignee,
        clientName: m.client_name,
        createdAt: m.created_at.toISOString(),
        read: readKeys.has(`portal_message:${m.id}`),
      });
    }

    let filtered = items;
    if (filters?.type) filtered = filtered.filter((i) => i.type === filters.type);
    if (filters?.assigneeId) {
      filtered = filtered.filter((i) => i.assigneeId === filters.assigneeId);
    }
    if (filters?.unreadOnly) filtered = filtered.filter((i) => !i.read);

    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return filtered.slice(0, limit);
  });
}

export async function markInboxItemRead(userId: string, itemKey: string): Promise<void> {
  await withDb(async (query) => {
    await query(
      `INSERT INTO crm_inbox_reads (user_id, item_key, read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, item_key) DO UPDATE SET read_at = NOW()`,
      [userId, itemKey],
    );
  });
}

export async function markAllInboxRead(userId: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await withDb(async (query) => {
    for (const key of keys) {
      await query(
        `INSERT INTO crm_inbox_reads (user_id, item_key, read_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, item_key) DO UPDATE SET read_at = NOW()`,
        [userId, key],
      );
    }
  });
}

export async function countUnreadInbox(userId: string): Promise<number> {
  const items = await listInboxItems(userId, { unreadOnly: true }, 200);
  return items.length;
}
