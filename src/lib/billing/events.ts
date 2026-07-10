import type { QueryResultRow } from "pg";
import { withDb } from "@/lib/db";
import type { BillingActor, BillingEntityType, BillingEvent } from "@/lib/billing/types";

type BillingEventRow = {
  id: string;
  entity_type: BillingEntityType;
  entity_id: string;
  action: string;
  actor_type: BillingActor["type"];
  actor_id: string | null;
  actor_name: string | null;
  from_status: string | null;
  to_status: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
};

function mapEvent(row: BillingEventRow): BillingEvent {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    actorType: row.actor_type,
    actorId: row.actor_id,
    actorName: row.actor_name,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    summary: row.summary,
    metadata: row.metadata ?? {},
    createdAt: row.created_at.toISOString(),
  };
}

export async function logBillingEvent(input: {
  entityType: BillingEntityType;
  entityId: string;
  action: string;
  actor: BillingActor;
  fromStatus?: string | null;
  toStatus?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<BillingEvent> {
  return withDb(async (query) => {
    const { rows } = await query<BillingEventRow>(
      `INSERT INTO billing_events (
        entity_type, entity_id, action, actor_type, actor_id, actor_name,
        from_status, to_status, summary, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
      RETURNING *`,
      [
        input.entityType,
        input.entityId,
        input.action,
        input.actor.type,
        input.actor.id ?? null,
        input.actor.name ?? null,
        input.fromStatus ?? null,
        input.toStatus ?? null,
        input.summary,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    return mapEvent(rows[0]);
  });
}

export async function listBillingEvents(
  entityType: BillingEntityType,
  entityId: string,
  limit = 50,
): Promise<BillingEvent[]> {
  return withDb(async (query) => {
    const { rows } = await query<BillingEventRow>(
      `SELECT * FROM billing_events
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [entityType, entityId, limit],
    );
    return rows.map(mapEvent);
  });
}

export type { QueryResultRow };
