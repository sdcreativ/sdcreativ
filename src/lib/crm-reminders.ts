import { withDb } from "@/lib/db";

export async function listFiredReminderKeys(keys: string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set();

  return withDb(async (query) => {
    const { rows } = await query<{ reminder_key: string }>(
      `SELECT reminder_key FROM crm_reminder_logs WHERE reminder_key = ANY($1::text[])`,
      [keys],
    );
    return new Set(rows.map((r) => r.reminder_key));
  });
}

/** Rappels déjà déclenchés pour un canal donné (in_app, email, …). */
export async function listFiredReminderKeysForChannel(
  keys: string[],
  channel: string,
): Promise<Set<string>> {
  if (keys.length === 0) return new Set();

  return withDb(async (query) => {
    const { rows } = await query<{ reminder_key: string }>(
      `SELECT reminder_key FROM crm_reminder_logs
       WHERE reminder_key = ANY($1::text[])
         AND channels @> $2::jsonb`,
      [keys, JSON.stringify([channel])],
    );
    return new Set(rows.map((r) => r.reminder_key));
  });
}

export async function markRemindersFired(
  entries: Array<{
    key: string;
    itemId: string;
    itemType: string;
    title: string;
    triggerAt: string;
    channels?: string[];
  }>,
): Promise<void> {
  if (entries.length === 0) return;

  await withDb(async (query) => {
    for (const entry of entries) {
      const channels = JSON.stringify(entry.channels ?? ["in_app"]);
      await query(
        `INSERT INTO crm_reminder_logs (
          reminder_key, item_id, item_type, title, trigger_at, channels
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        ON CONFLICT (reminder_key) DO UPDATE SET
          channels = (
            SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::jsonb)
            FROM (
              SELECT jsonb_array_elements_text(crm_reminder_logs.channels) AS elem
              UNION
              SELECT jsonb_array_elements_text(EXCLUDED.channels) AS elem
            ) merged
          )`,
        [
          entry.key,
          entry.itemId,
          entry.itemType,
          entry.title.slice(0, 200),
          entry.triggerAt,
          channels,
        ],
      );
    }
  });
}

export async function listRecentReminderLogs(limit = 20) {
  return withDb(async (query) => {
    const { rows } = await query<{
      reminder_key: string;
      item_id: string;
      item_type: string;
      title: string;
      trigger_at: Date;
      channels: string[];
      created_at: Date;
    }>(
      `SELECT reminder_key, item_id, item_type, title, trigger_at, channels, created_at
       FROM crm_reminder_logs
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );
    return rows.map((r) => ({
      key: r.reminder_key,
      itemId: r.item_id,
      itemType: r.item_type,
      title: r.title,
      triggerAt: r.trigger_at.toISOString(),
      channels: r.channels,
      createdAt: r.created_at.toISOString(),
    }));
  });
}
