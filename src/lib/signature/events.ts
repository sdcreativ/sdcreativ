import { withDb } from "@/lib/db";
import type { SignatureEntityType, SignatureEventType } from "@/lib/signature/types";

export type SignatureEvent = {
  id: string;
  entityType: SignatureEntityType;
  entityId: string;
  eventType: string;
  ipAddress: string | null;
  userAgent: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export async function logSignatureEvent(input: {
  entityType: SignatureEntityType;
  entityId: string;
  eventType: SignatureEventType | string;
  ipAddress?: string | null;
  userAgent?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await withDb(async (query) => {
    await query(
      `INSERT INTO signature_events
         (entity_type, entity_id, event_type, ip_address, user_agent, payload)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        input.entityType,
        input.entityId,
        input.eventType.slice(0, 80),
        input.ipAddress ?? null,
        input.userAgent ?? null,
        JSON.stringify(input.payload ?? {}),
      ],
    );
  });
}

export async function listSignatureEvents(
  entityType: SignatureEntityType,
  entityId: string,
): Promise<SignatureEvent[]> {
  return withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      entity_type: SignatureEntityType;
      entity_id: string;
      event_type: string;
      ip_address: string | null;
      user_agent: string | null;
      payload: Record<string, unknown> | null;
      created_at: Date;
    }>(
      `SELECT * FROM signature_events
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC
       LIMIT 50`,
      [entityType, entityId],
    );
    return rows.map((r) => ({
      id: r.id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      eventType: r.event_type,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      payload: r.payload ?? {},
      createdAt: r.created_at.toISOString(),
    }));
  });
}
