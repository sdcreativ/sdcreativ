import { withDb } from "@/lib/db";

export type LoginLogEntry = {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  createdAt: string;
};

type Row = {
  id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  created_at: Date;
};

function mapRow(row: Row): LoginLogEntry {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    name: row.name,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    success: row.success,
    createdAt: row.created_at.toISOString(),
  };
}

export async function logAdminLogin(input: {
  userId?: string | null;
  email: string;
  name?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  success?: boolean;
}): Promise<void> {
  try {
    await withDb(async (query) => {
      await query(
        `INSERT INTO crm_login_logs (user_id, email, name, ip_address, user_agent, success)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          input.userId ?? null,
          input.email,
          input.name ?? null,
          input.ipAddress ?? null,
          input.userAgent ?? null,
          input.success !== false,
        ],
      );
    });
  } catch (error) {
    console.error("[crm-login-logs] insert failed", error);
  }
}

export async function listAdminLoginLogs(limit = 50): Promise<LoginLogEntry[]> {
  return withDb(async (query) => {
    const { rows } = await query<Row>(
      `SELECT * FROM crm_login_logs ORDER BY created_at DESC LIMIT $1`,
      [Math.min(200, Math.max(10, limit))],
    );
    return rows.map(mapRow);
  });
}
