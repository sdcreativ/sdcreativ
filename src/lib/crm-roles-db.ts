import { z } from "zod";
import type { CrmPermission } from "@/lib/crm-permissions";
import { CRM_PERMISSIONS, ROLE_PERMISSIONS, setRolePermissionsCache } from "@/lib/crm-permissions";
import type { SystemCrmRole } from "@/content/crm-roles";
import { CRM_ROLE_LABELS, SYSTEM_CRM_ROLES } from "@/content/crm-roles";
import { withDb } from "@/lib/db";

export type CrmRoleRecord = {
  id: string;
  slug: string;
  label: string;
  permissions: CrmPermission[];
  isSystem: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
};

type RoleRow = {
  id: string;
  slug: string;
  label: string;
  permissions: CrmPermission[];
  is_system: boolean;
  user_count: string;
  created_at: Date;
  updated_at: Date;
};

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(48)
  .regex(/^[a-z][a-z0-9_]*$/, "Slug : minuscules, chiffres et _ uniquement.");

export const createCrmRoleSchema = z.object({
  slug: slugSchema,
  label: z.string().trim().min(2).max(100),
  permissions: z.array(z.enum(CRM_PERMISSIONS)).default([]),
});

export const updateCrmRoleSchema = z.object({
  label: z.string().trim().min(2).max(100).optional(),
  permissions: z.array(z.enum(CRM_PERMISSIONS)).optional(),
});

let permissionsCache: Map<string, CrmPermission[]> | null = null;
let labelsCache: Map<string, string> | null = null;

export function invalidateCrmRolesCache(): void {
  permissionsCache = null;
  labelsCache = null;
}

function mapRole(row: RoleRow): CrmRoleRecord {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    permissions: row.permissions ?? [],
    isSystem: row.is_system,
    userCount: Number(row.user_count ?? 0),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const ROLE_SELECT = `
  SELECT r.id, r.slug, r.label, r.permissions, r.is_system, r.created_at, r.updated_at,
         (SELECT COUNT(*)::text FROM crm_users u WHERE u.role = r.slug) AS user_count
  FROM crm_roles r
`;

export async function refreshCrmRolesCache(): Promise<void> {
  const roles = await listCrmRoles();
  permissionsCache = new Map(roles.map((r) => [r.slug, r.permissions]));
  labelsCache = new Map(roles.map((r) => [r.slug, r.label]));
  setRolePermissionsCache(permissionsCache);
}

export async function ensureCrmRolesCache(): Promise<void> {
  if (!permissionsCache) {
    await refreshCrmRolesCache();
  }
}

export function getCachedRolePermissions(slug: string): CrmPermission[] {
  if (permissionsCache?.has(slug)) {
    return permissionsCache.get(slug)!;
  }
  if ((SYSTEM_CRM_ROLES as readonly string[]).includes(slug)) {
    return ROLE_PERMISSIONS[slug as SystemCrmRole];
  }
  return [];
}

export function getCachedRoleLabel(slug: string): string {
  return labelsCache?.get(slug) ?? CRM_ROLE_LABELS[slug as SystemCrmRole] ?? slug;
}

export async function listCrmRoles(): Promise<CrmRoleRecord[]> {
  return withDb(async (query) => {
    const { rows } = await query<RoleRow>(`${ROLE_SELECT} ORDER BY r.is_system DESC, r.label ASC`);
    return rows.map(mapRole);
  });
}

export async function roleSlugExists(slug: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rows } = await query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM crm_roles WHERE slug = $1) AS exists`,
      [slug],
    );
    return rows[0]?.exists ?? false;
  });
}

export async function createCrmRole(input: z.infer<typeof createCrmRoleSchema>): Promise<CrmRoleRecord> {
  const role = await withDb(async (query) => {
    const { rows } = await query<RoleRow>(
      `INSERT INTO crm_roles (slug, label, permissions, is_system)
       VALUES ($1, $2, $3::jsonb, false)
       RETURNING id, slug, label, permissions, is_system, created_at, updated_at, '0' AS user_count`,
      [input.slug, input.label, JSON.stringify(input.permissions)],
    );
    return mapRole(rows[0]!);
  });
  invalidateCrmRolesCache();
  return role;
}

export async function updateCrmRole(
  id: string,
  input: z.infer<typeof updateCrmRoleSchema>,
): Promise<CrmRoleRecord | null> {
  const role = await withDb(async (query) => {
    const { rows: existing } = await query<{ slug: string; is_system: boolean }>(
      `SELECT slug, is_system FROM crm_roles WHERE id = $1`,
      [id],
    );
    if (!existing[0]) return null;

    const { rows } = await query<RoleRow>(
      `UPDATE crm_roles SET
        label = COALESCE($2, label),
        permissions = COALESCE($3::jsonb, permissions),
        updated_at = NOW()
       WHERE id = $1
       RETURNING id, slug, label, permissions, is_system, created_at, updated_at, '0' AS user_count`,
      [
        id,
        input.label ?? null,
        input.permissions ? JSON.stringify(input.permissions) : null,
      ],
    );
    const updated = rows[0];
    if (!updated) return null;

    const { rows: countRows } = await query<{ user_count: string }>(
      `SELECT COUNT(*)::text AS user_count FROM crm_users WHERE role = $1`,
      [updated.slug],
    );
    return mapRole({ ...updated, user_count: countRows[0]?.user_count ?? "0" });
  });

  if (role) invalidateCrmRolesCache();
  return role;
}

export async function deleteCrmRole(id: string): Promise<{ ok: boolean; error?: string }> {
  const result = await withDb(async (query) => {
    const { rows } = await query<{ slug: string; is_system: boolean }>(
      `SELECT slug, is_system FROM crm_roles WHERE id = $1`,
      [id],
    );
    const role = rows[0];
    if (!role) return { ok: false, error: "Rôle introuvable." };
    if (role.is_system) return { ok: false, error: "Les rôles système ne peuvent pas être supprimés." };

    const { rows: usage } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM crm_users WHERE role = $1`,
      [role.slug],
    );
    if (Number(usage[0]?.count ?? 0) > 0) {
      return { ok: false, error: "Ce rôle est encore assigné à des utilisateurs." };
    }

    await query(`DELETE FROM crm_roles WHERE id = $1`, [id]);
    return { ok: true };
  });

  if (result.ok) invalidateCrmRolesCache();
  return result;
}

/** Insère les 4 rôles système si la table est vide (appelé depuis ensureSchema). */
export async function seedSystemCrmRoles(
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }>,
): Promise<void> {
  const { rows } = await query(`SELECT COUNT(*)::text AS count FROM crm_roles`);
  const count = Number((rows[0] as { count: string } | undefined)?.count ?? 0);
  if (count > 0) return;

  for (const slug of SYSTEM_CRM_ROLES) {
    await query(
      `INSERT INTO crm_roles (slug, label, permissions, is_system)
       VALUES ($1, $2, $3::jsonb, true)
       ON CONFLICT (slug) DO NOTHING`,
      [slug, CRM_ROLE_LABELS[slug], JSON.stringify(ROLE_PERMISSIONS[slug])],
    );
  }
}
