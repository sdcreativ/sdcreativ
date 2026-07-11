import { withDb } from "@/lib/db";

export type CrmNotificationAudience = "admin" | "portal";

export type CrmNotification = {
  id: string;
  audience: CrmNotificationAudience;
  portalClientId: string | null;
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

export async function createCrmNotification(input: {
  audience: CrmNotificationAudience;
  portalClientId?: string | null;
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
        audience, portal_client_id, category, event_type, title, message,
        link_href, entity_type, entity_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        input.audience,
        input.portalClientId ?? null,
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
): Promise<CrmNotification[]> {
  return withDb(async (query) => {
    const { rows } = await query<NotificationRow>(
      since
        ? `SELECT * FROM crm_notifications
           WHERE audience = 'admin' AND created_at > $1
           ORDER BY created_at DESC LIMIT $2`
        : `SELECT * FROM crm_notifications
           WHERE audience = 'admin' AND read_at IS NULL
           ORDER BY created_at DESC LIMIT $1`,
      since ? [since, limit] : [limit],
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

export async function countUnreadAdminNotifications(): Promise<number> {
  return withDb(async (query) => {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM crm_notifications
       WHERE audience = 'admin' AND read_at IS NULL`,
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

export async function listAdminNotificationHistory(limit = 30): Promise<CrmNotification[]> {
  return withDb(async (query) => {
    const { rows } = await query<NotificationRow>(
      `SELECT * FROM crm_notifications
       WHERE audience = 'admin'
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
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

export async function markAllAdminNotificationsRead(): Promise<void> {
  await withDb(async (query) => {
    await query(
      `UPDATE crm_notifications SET read_at = NOW()
       WHERE audience = 'admin' AND read_at IS NULL`,
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
