import { z } from "zod";
import { withDb } from "@/lib/db";

export type CrmUserProfile = {
  avatarUrl: string | null;
};

export const DEFAULT_CRM_USER_PROFILE: CrmUserProfile = {
  avatarUrl: null,
};

export const updateOwnProfileSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  avatarUrl: z.string().trim().max(2048).nullable().optional(),
});

function parseProfile(raw: Record<string, unknown> | null): CrmUserProfile {
  const profile = raw?.profile;
  if (!profile || typeof profile !== "object") return { ...DEFAULT_CRM_USER_PROFILE };
  const obj = profile as Partial<CrmUserProfile>;
  return {
    avatarUrl: typeof obj.avatarUrl === "string" && obj.avatarUrl.trim() ? obj.avatarUrl.trim() : null,
  };
}

export async function getCrmUserProfile(userId: string): Promise<CrmUserProfile> {
  return withDb(async (query) => {
    const { rows } = await query<{ preferences: Record<string, unknown> | null }>(
      `SELECT preferences FROM crm_users WHERE id = $1`,
      [userId],
    );
    return parseProfile(rows[0]?.preferences ?? null);
  });
}

export async function updateCrmUserProfile(
  userId: string,
  input: z.infer<typeof updateOwnProfileSchema>,
): Promise<CrmUserProfile> {
  return withDb(async (query) => {
    const { rows } = await query<{ preferences: Record<string, unknown> | null }>(
      `SELECT preferences FROM crm_users WHERE id = $1`,
      [userId],
    );
    const existing = rows[0]?.preferences ?? {};
    const current = parseProfile(existing);
    const next: CrmUserProfile = {
      avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl : current.avatarUrl,
    };

    if (input.name) {
      await query(`UPDATE crm_users SET name = $2, updated_at = NOW() WHERE id = $1`, [
        userId,
        input.name,
      ]);
    }

    await query(`UPDATE crm_users SET preferences = $2, updated_at = NOW() WHERE id = $1`, [
      userId,
      JSON.stringify({ ...existing, profile: next }),
    ]);

    return next;
  });
}
