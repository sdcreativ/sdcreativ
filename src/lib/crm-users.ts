import { z } from "zod";
import type { CrmRole } from "@/content/crm-roles";
import {
  generateInviteToken,
  getInvitationUrl,
  hashInviteToken,
  INVITE_EXPIRY_HOURS,
  sendUserInvitationEmail,
} from "@/lib/crm-invitation";
import { hashPassword, verifyPassword } from "@/lib/crm-password";
import { getCachedRoleLabel, ensureCrmRolesCache, roleSlugExists } from "@/lib/crm-roles-db";
import { withDb } from "@/lib/db";
import { getRolePermissions, roleHasPermission } from "@/lib/crm-permissions";

export type CrmUser = {
  id: string;
  email: string;
  name: string;
  role: CrmRole;
  active: boolean;
  invitationPending: boolean;
  createdAt: string;
  updatedAt: string;
};

type CrmUserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  role: CrmRole;
  active: boolean;
  invite_token_hash: string | null;
  invite_token_expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const USER_COLUMNS = `
  id, email, password_hash, name, role, active,
  invite_token_hash, invite_token_expires_at,
  created_at, updated_at
`;

function mapUser(row: CrmUserRow): CrmUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    active: row.active,
    invitationPending: row.password_hash === null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const createCrmUserSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(2).max(160),
  role: z.string().trim().min(2).max(50).default("commercial"),
  active: z.boolean().default(true),
});

export const updateCrmUserSchema = z.object({
  email: z.string().trim().email().max(255).optional(),
  name: z.string().trim().min(2).max(160).optional(),
  password: z.string().min(8).max(128).optional(),
  role: z.string().trim().min(2).max(50).optional(),
  active: z.boolean().optional(),
});

export const acceptInvitationSchema = z.object({
  token: z.string().trim().min(16).max(128),
  password: z.string().min(8).max(128),
});

export type InviteValidation = {
  valid: boolean;
  name?: string;
  email?: string;
  expired?: boolean;
};

function inviteExpiryDate(): Date {
  return new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);
}

async function issueInvitation(
  userId: string,
  name: string,
  email: string,
  role: CrmRole,
): Promise<{ token: string; sent: boolean }> {
  await ensureCrmRolesCache();
  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = inviteExpiryDate();

  await withDb(async (query) => {
    await query(
      `UPDATE crm_users SET
        invite_token_hash = $2,
        invite_token_expires_at = $3,
        updated_at = NOW()
       WHERE id = $1`,
      [userId, tokenHash, expiresAt.toISOString()],
    );
  });

  const roleLabel = getCachedRoleLabel(role);
  const inviteUrl = getInvitationUrl(token);
  const sent = await sendUserInvitationEmail({ name, email, roleLabel, inviteUrl });

  return { token, sent };
}

export async function listCrmUsers(): Promise<CrmUser[]> {
  return withDb(async (query) => {
    const { rows } = await query<CrmUserRow>(
      `SELECT ${USER_COLUMNS} FROM crm_users ORDER BY name ASC`,
    );
    return rows.map(mapUser);
  });
}

export async function listActiveTeamNames(): Promise<string[]> {
  return withDb(async (query) => {
    const { rows } = await query<{ name: string }>(
      `SELECT name FROM crm_users WHERE active = true AND password_hash IS NOT NULL ORDER BY name ASC`,
    );
    return rows.map((r) => r.name);
  });
}

export async function getCrmUserEmailByName(name: string): Promise<string | null> {
  return withDb(async (query) => {
    const { rows } = await query<{ email: string }>(
      `SELECT email FROM crm_users WHERE name = $1 AND active = true AND password_hash IS NOT NULL LIMIT 1`,
      [name.trim()],
    );
    return rows[0]?.email ?? null;
  });
}

export async function authenticateCrmUser(
  email: string,
  password: string,
): Promise<CrmUser | "pending" | null> {
  return withDb(async (query) => {
    const { rows } = await query<CrmUserRow>(
      `SELECT ${USER_COLUMNS} FROM crm_users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email.trim()],
    );
    const row = rows[0];
    if (!row || !row.active) return null;
    if (!row.password_hash) return "pending";
    const ok = await verifyPassword(password, row.password_hash);
    return ok ? mapUser(row) : null;
  });
}

export async function createCrmUser(
  input: z.infer<typeof createCrmUserSchema>,
): Promise<{ user: CrmUser; invitationSent: boolean }> {
  if (!(await roleSlugExists(input.role))) {
    throw new Error("Rôle invalide ou inexistant.");
  }

  const user = await withDb(async (query) => {
    const { rows } = await query<CrmUserRow>(
      `INSERT INTO crm_users (email, password_hash, name, role, active)
       VALUES ($1, NULL, $2, $3, $4)
       RETURNING ${USER_COLUMNS}`,
      [input.email.toLowerCase(), input.name, input.role, input.active],
    );
    return mapUser(rows[0]!);
  });

  const { sent } = await issueInvitation(user.id, user.name, user.email, user.role);
  return { user, invitationSent: sent };
}

export async function resendUserInvitation(
  userId: string,
): Promise<{ ok: boolean; error?: string; invitationSent?: boolean }> {
  const row = await withDb(async (query) => {
    const { rows } = await query<CrmUserRow>(
      `SELECT ${USER_COLUMNS} FROM crm_users WHERE id = $1`,
      [userId],
    );
    return rows[0] ?? null;
  });

  if (!row) return { ok: false, error: "Utilisateur introuvable." };
  if (row.password_hash) {
    return { ok: false, error: "Ce compte est déjà activé." };
  }
  if (!row.active) {
    return { ok: false, error: "Ce compte est inactif." };
  }

  const { sent } = await issueInvitation(row.id, row.name, row.email, row.role);
  return { ok: true, invitationSent: sent };
}

export async function validateInviteToken(token: string): Promise<InviteValidation> {
  const tokenHash = hashInviteToken(token);

  return withDb(async (query) => {
    const { rows } = await query<CrmUserRow>(
      `SELECT ${USER_COLUMNS} FROM crm_users
       WHERE invite_token_hash = $1 LIMIT 1`,
      [tokenHash],
    );
    const row = rows[0];
    if (!row || !row.active) return { valid: false };
    if (row.password_hash) return { valid: false };

    const expired =
      !row.invite_token_expires_at || row.invite_token_expires_at.getTime() < Date.now();
    if (expired) {
      return { valid: false, expired: true, email: row.email, name: row.name };
    }

    return { valid: true, name: row.name, email: row.email };
  });
}

export async function acceptInvitation(
  token: string,
  password: string,
): Promise<{ ok: boolean; error?: string; user?: CrmUser }> {
  const validation = await validateInviteToken(token);
  if (!validation.valid) {
    if (validation.expired) {
      return { ok: false, error: "Ce lien d'invitation a expiré. Demandez un nouvel envoi à votre administrateur." };
    }
    return { ok: false, error: "Lien d'invitation invalide ou déjà utilisé." };
  }

  const tokenHash = hashInviteToken(token);
  const passwordHash = await hashPassword(password);

  return withDb(async (query) => {
    const { rows } = await query<CrmUserRow>(
      `UPDATE crm_users SET
        password_hash = $2,
        invite_token_hash = NULL,
        invite_token_expires_at = NULL,
        updated_at = NOW()
       WHERE invite_token_hash = $1
         AND password_hash IS NULL
         AND active = true
         AND invite_token_expires_at > NOW()
       RETURNING ${USER_COLUMNS}`,
      [tokenHash, passwordHash],
    );
    const row = rows[0];
    if (!row) {
      return { ok: false, error: "Lien d'invitation invalide ou déjà utilisé." };
    }
    return { ok: true, user: mapUser(row) };
  });
}

export async function updateCrmUser(
  id: string,
  input: z.infer<typeof updateCrmUserSchema>,
): Promise<CrmUser | null> {
  return withDb(async (query) => {
    const { rows: existingRows } = await query<CrmUserRow>(
      `SELECT ${USER_COLUMNS} FROM crm_users WHERE id = $1`,
      [id],
    );
    const existing = existingRows[0];
    if (!existing) return null;

    if (input.role && !(await roleSlugExists(input.role))) {
      throw new Error("Rôle invalide ou inexistant.");
    }

    let passwordHash = existing.password_hash;
    if (input.password) {
      passwordHash = await hashPassword(input.password);
    }

    const { rows } = await query<CrmUserRow>(
      `UPDATE crm_users SET
        email = $2,
        password_hash = $3,
        name = $4,
        role = $5,
        active = $6,
        invite_token_hash = CASE WHEN $7::varchar IS NOT NULL THEN NULL ELSE invite_token_hash END,
        invite_token_expires_at = CASE WHEN $7::varchar IS NOT NULL THEN NULL ELSE invite_token_expires_at END,
        updated_at = NOW()
       WHERE id = $1
       RETURNING ${USER_COLUMNS}`,
      [
        id,
        (input.email ?? existing.email).toLowerCase(),
        passwordHash,
        input.name ?? existing.name,
        input.role ?? existing.role,
        input.active ?? existing.active,
        input.password ?? null,
      ],
    );
    return mapUser(rows[0]!);
  });
}

export async function deleteCrmUser(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM crm_users WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function ensureBootstrapAdmin(): Promise<void> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return;

  await withDb(async (query) => {
    const { rows } = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM crm_users`);
    if (Number(rows[0]?.count ?? 0) > 0) return;

    const passwordHash = await hashPassword(secret);
    const email = process.env.CRM_BOOTSTRAP_EMAIL ?? "admin@sdcreativ.com";
    const name = process.env.CRM_BOOTSTRAP_NAME ?? "Administrateur SD CREATIV";

    await query(
      `INSERT INTO crm_users (email, password_hash, name, role, active)
       VALUES ($1, $2, $3, 'admin', true)
       ON CONFLICT (email) DO NOTHING`,
      [email.toLowerCase(), passwordHash, name],
    );
  });
}

export async function verifyCrmUserPassword(userId: string, password: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rows } = await query<{ password_hash: string | null; active: boolean }>(
      `SELECT password_hash, active FROM crm_users WHERE id = $1`,
      [userId],
    );
    const row = rows[0];
    if (!row?.active || !row.password_hash) return false;
    return verifyPassword(password, row.password_hash);
  });
}

export function roleCanManageUsers(role: CrmRole): boolean {
  return roleHasPermission(role, "users.manage");
}

export function roleCanWrite(role: CrmRole): boolean {
  return getRolePermissions(role).some((p) => p.endsWith(".write"));
}

export function parseCrmRole(value: string): CrmRole | null {
  return value.trim().length >= 2 ? value.trim() : null;
}
