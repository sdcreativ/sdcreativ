import { withDb } from "@/lib/db";

export type CrmAuditLog = {
  id: string;
  actorId: string | null;
  actorName: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type AuditRow = {
  id: string;
  actor_id: string | null;
  actor_name: string;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
};

function mapLog(row: AuditRow): CrmAuditLog {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorEmail: row.actor_email,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    summary: row.summary,
    metadata: row.metadata ?? {},
    createdAt: row.created_at.toISOString(),
  };
}

export type AuditActor = {
  userId: string | null;
  name: string;
  email: string | null;
};

export async function logCrmAudit(input: {
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await withDb(async (query) => {
      await query(
        `INSERT INTO crm_audit_logs (actor_id, actor_name, actor_email, action, entity_type, entity_id, summary, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          input.actor.userId,
          input.actor.name,
          input.actor.email,
          input.action,
          input.entityType,
          input.entityId ?? null,
          input.summary,
          JSON.stringify(input.metadata ?? {}),
        ],
      );
    });
  } catch (error) {
    console.error("[crm-audit] log failed", error);
  }
}

export async function listCrmAuditLogs(limit = 50): Promise<CrmAuditLog[]> {
  return withDb(async (query) => {
    const { rows } = await query<AuditRow>(
      `SELECT * FROM crm_audit_logs ORDER BY created_at DESC LIMIT $1`,
      [Math.min(limit, 200)],
    );
    return rows.map(mapLog);
  });
}
