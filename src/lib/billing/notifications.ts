import { withDb } from "@/lib/db";

export type CrmNotificationAudience = "admin" | "portal";

export type CrmNotification = {
  id: string;
  audience: CrmNotificationAudience;
  portalClientId: string | null;
  recipientName: string | null;
  category: string;
  eventType: string;
  title: string;
  message: string;
  linkHref: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  audience: CrmNotificationAudience;
  portal_client_id: string | null;
  recipient_name: string | null;
  category: string;
  event_type: string;
  title: string;
  message: string;
  link_href: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: Date | null;
  created_at: Date;
};

function mapNotification(row: NotificationRow): CrmNotification {
  return {
    id: row.id,
    audience: row.audience,
    portalClientId: row.portal_client_id,
    recipientName: row.recipient_name,
    category: row.category,
    eventType: row.event_type,
    title: row.title,
    message: row.message,
    linkHref: row.link_href,
    entityType: row.entity_type,
    entityId: row.entity_id,
    readAt: row.read_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

function adminRecipientClause(recipientName: string | undefined, paramIndex: number): string {
  if (!recipientName?.trim()) {
    return "audience = 'admin' AND recipient_name IS NULL";
  }
  return `(audience = 'admin' AND (recipient_name IS NULL OR recipient_name = $${paramIndex}))`;
}

export async function createCrmNotification(input: {
  audience: CrmNotificationAudience;
  portalClientId?: string | null;
  recipientName?: string | null;
  category?: string;
  eventType: string;
  title: string;
  message: string;
  linkHref?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}): Promise<CrmNotification> {
  return withDb(async (query) => {
    const { rows } = await query<NotificationRow>(
      `INSERT INTO crm_notifications (
        audience, portal_client_id, recipient_name, category, event_type, title, message,
        link_href, entity_type, entity_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        input.audience,
        input.portalClientId ?? null,
        input.recipientName ?? null,
        input.category ?? "billing",
        input.eventType,
        input.title.slice(0, 200),
        input.message.slice(0, 2000),
        input.linkHref ?? null,
        input.entityType ?? null,
        input.entityId ?? null,
      ],
    );
    return mapNotification(rows[0]);
  });
}

export async function createAdminTaskNotification(input: {
  recipientName: string;
  eventType: "task_assigned" | "task_updated";
  title: string;
  message: string;
  linkHref?: string;
  taskId: string;
}): Promise<CrmNotification> {
  return createCrmNotification({
    audience: "admin",
    category: "tasks",
    recipientName: input.recipientName,
    eventType: input.eventType,
    title: input.title,
    message: input.message,
    linkHref: input.linkHref,
    entityType: "task",
    entityId: input.taskId,
  });
}

export async function createAdminTicketNotification(input: {
  eventType: string;
  title: string;
  message: string;
  linkHref?: string;
  entityType?: string;
  entityId?: string;
}): Promise<CrmNotification> {
  return createCrmNotification({
    audience: "admin",
    category: "tickets",
    ...input,
  });
}

export async function createAdminBillingNotification(input: {
  eventType: string;
  title: string;
  message: string;
  linkHref?: string;
  entityType?: string;
  entityId?: string;
}): Promise<CrmNotification> {
  return createCrmNotification({
    audience: "admin",
    category: "billing",
    ...input,
  });
}

export async function createPortalBillingNotification(input: {
  portalClientId: string;
  eventType: string;
  title: string;
  message: string;
  linkHref?: string;
  entityType?: string;
  entityId?: string;
}): Promise<CrmNotification> {
  return createCrmNotification({
    audience: "portal",
    category: "billing",
    portalClientId: input.portalClientId,
    eventType: input.eventType,
    title: input.title,
    message: input.message,
    linkHref: input.linkHref,
    entityType: input.entityType,
    entityId: input.entityId,
  });
}

export async function listAdminNotificationsSince(
  since?: string,
  limit = 30,
  recipientName?: string,
): Promise<CrmNotification[]> {
  return withDb(async (query) => {
    const params: unknown[] = [];
    let idx = 1;
    let where = "audience = 'admin'";

    if (recipientName?.trim()) {
      params.push(recipientName.trim());
      where += ` AND (recipient_name IS NULL OR recipient_name = $${idx++})`;
    } else {
      where += " AND recipient_name IS NULL";
    }

    if (since) {
      params.push(since, limit);
      const { rows } = await query<NotificationRow>(
        `SELECT * FROM crm_notifications
         WHERE ${where} AND created_at > $${idx++}
         ORDER BY created_at DESC LIMIT $${idx}`,
        params,
      );
      return rows.map(mapNotification);
    }

    params.push(limit);
    const { rows } = await query<NotificationRow>(
      `SELECT * FROM crm_notifications
       WHERE ${where} AND read_at IS NULL
       ORDER BY created_at DESC LIMIT $${idx}`,
      params,
    );
    return rows.map(mapNotification);
  });
}

export async function listPortalNotificationsSince(
  portalClientId: string,
  since?: string,
  limit = 20,
): Promise<CrmNotification[]> {
  return withDb(async (query) => {
    const { rows } = await query<NotificationRow>(
      since
        ? `SELECT * FROM crm_notifications
           WHERE audience = 'portal' AND portal_client_id = $1 AND created_at > $2
           ORDER BY created_at DESC LIMIT $3`
        : `SELECT * FROM crm_notifications
           WHERE audience = 'portal' AND portal_client_id = $1 AND read_at IS NULL
           ORDER BY created_at DESC LIMIT $2`,
      since ? [portalClientId, since, limit] : [portalClientId, limit],
    );
    return rows.map(mapNotification);
  });
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await withDb(async (query) => {
    await query(
      `UPDATE crm_notifications SET read_at = NOW() WHERE id = ANY($1::uuid[]) AND read_at IS NULL`,
      [ids],
    );
  });
}

export async function countUnreadAdminNotifications(recipientName?: string): Promise<number> {
  return withDb(async (query) => {
    const params: unknown[] = [];
    if (recipientName?.trim()) params.push(recipientName.trim());
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM crm_notifications
       WHERE ${adminRecipientClause(recipientName, 1)} AND read_at IS NULL`,
      params,
    );
    return Number(rows[0]?.count ?? 0);
  });
}

export async function countUnreadPortalNotifications(portalClientId: string): Promise<number> {
  return withDb(async (query) => {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM crm_notifications
       WHERE audience = 'portal' AND portal_client_id = $1 AND read_at IS NULL`,
      [portalClientId],
    );
    return Number(rows[0]?.count ?? 0);
  });
}

export async function listAdminNotificationHistory(
  limit = 30,
  recipientName?: string,
): Promise<CrmNotification[]> {
  return withDb(async (query) => {
    const params: unknown[] = [];
    if (recipientName?.trim()) params.push(recipientName.trim());
    params.push(limit);
    const { rows } = await query<NotificationRow>(
      `SELECT * FROM crm_notifications
       WHERE ${adminRecipientClause(recipientName, 1)}
       ORDER BY created_at DESC LIMIT $${recipientName?.trim() ? 2 : 1}`,
      params,
    );
    return rows.map(mapNotification);
  });
}

export async function listPortalNotificationHistory(
  portalClientId: string,
  limit = 30,
): Promise<CrmNotification[]> {
  return withDb(async (query) => {
    const { rows } = await query<NotificationRow>(
      `SELECT * FROM crm_notifications
       WHERE audience = 'portal' AND portal_client_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [portalClientId, limit],
    );
    return rows.map(mapNotification);
  });
}

export async function markAllAdminNotificationsRead(recipientName?: string): Promise<void> {
  await withDb(async (query) => {
    const params: unknown[] = [];
    if (recipientName?.trim()) params.push(recipientName.trim());
    await query(
      `UPDATE crm_notifications SET read_at = NOW()
       WHERE ${adminRecipientClause(recipientName, 1)} AND read_at IS NULL`,
      params,
    );
  });
}

export async function markAllPortalNotificationsRead(portalClientId: string): Promise<void> {
  await withDb(async (query) => {
    await query(
      `UPDATE crm_notifications SET read_at = NOW()
       WHERE audience = 'portal' AND portal_client_id = $1 AND read_at IS NULL`,
      [portalClientId],
    );
  });
}
