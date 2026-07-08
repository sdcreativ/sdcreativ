import { z } from "zod";
import { teamMembers as staticTeamMembers } from "@/content/team";
import type { TeamMember } from "@/content/team";
import { slugifyBlogTitle } from "@/lib/blog-posts-types";
import { DEFAULT_IMAGE_POSITION, normalizeImagePosition } from "@/lib/image-position";
import { isDatabaseConfigured, withDb } from "@/lib/db";

export type PublicTeamMemberRecord = {
  id: string;
  slug: string;
  name: string;
  role: string;
  missions: string;
  initials: string;
  image: string;
  imageAlt: string;
  imagePosition: string;
  locale: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

type PublicTeamMemberRow = {
  id: string;
  slug: string;
  name: string;
  role: string;
  missions: string;
  initials: string;
  image: string;
  image_alt: string;
  image_position: string;
  locale: string;
  sort_order: number;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: PublicTeamMemberRow): PublicTeamMemberRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    role: row.role,
    missions: row.missions,
    initials: row.initials,
    image: row.image,
    imageAlt: row.image_alt,
    imagePosition: normalizeImagePosition(row.image_position),
    locale: row.locale,
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toTeamMember(record: PublicTeamMemberRecord): TeamMember {
  return {
    id: record.slug,
    name: record.name,
    role: record.role,
    missions: record.missions,
    initials: record.initials,
    image: record.image,
    imageAlt: record.imageAlt,
    imagePosition: record.imagePosition,
  };
}

function slugifyMemberName(name: string): string {
  return slugifyBlogTitle(name).slice(0, 120) || "membre";
}

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export const createPublicTeamMemberSchema = z.object({
  name: z.string().trim().min(2).max(200),
  role: z.string().trim().min(2).max(300),
  missions: z.string().trim().min(10).max(2000),
  initials: z.string().trim().max(8).optional(),
  image: z.string().trim().min(1).max(512),
  imageAlt: z.string().trim().min(2).max(300),
  imagePosition: z.string().trim().max(20).optional(),
  locale: z.enum(["fr", "en"]).default("fr"),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isVisible: z.boolean().default(true),
});

export const updatePublicTeamMemberSchema = createPublicTeamMemberSchema.partial();

export async function listPublicTeamMembers(options?: {
  locale?: string;
  visibleOnly?: boolean;
}): Promise<PublicTeamMemberRecord[]> {
  if (!isDatabaseConfigured()) return [];

  return withDb(async (query) => {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options?.locale) {
      params.push(options.locale);
      conditions.push(`locale = $${params.length}`);
    }
    if (options?.visibleOnly) {
      conditions.push("is_visible = true");
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await query<PublicTeamMemberRow>(
      `SELECT * FROM public_team_members ${where} ORDER BY sort_order ASC, name ASC`,
      params,
    );
    return rows.map(mapRow);
  });
}

export async function getPublicTeamMemberById(id: string): Promise<PublicTeamMemberRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<PublicTeamMemberRow>(
      `SELECT * FROM public_team_members WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function createPublicTeamMember(
  input: z.infer<typeof createPublicTeamMemberSchema>,
): Promise<PublicTeamMemberRecord> {
  const name = input.name.trim();
  const slug = slugifyMemberName(name);
  const initials = input.initials?.trim() || deriveInitials(name);

  return withDb(async (query) => {
    const sortOrder =
      input.sortOrder ??
      (await query<{ next: number }>(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM public_team_members WHERE locale = $1`,
        [input.locale],
      )).rows[0]?.next ??
      0;

    const { rows } = await query<PublicTeamMemberRow>(
      `INSERT INTO public_team_members (
        slug, name, role, missions, initials, image, image_alt, image_position, locale, sort_order, is_visible
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        slug,
        name,
        input.role.trim(),
        input.missions.trim(),
        initials,
        input.image.trim(),
        input.imageAlt.trim(),
        normalizeImagePosition(input.imagePosition),
        input.locale,
        sortOrder,
        input.isVisible,
      ],
    );
    return mapRow(rows[0]!);
  });
}

export async function updatePublicTeamMember(
  id: string,
  input: z.infer<typeof updatePublicTeamMemberSchema>,
): Promise<PublicTeamMemberRecord | null> {
  const existing = await getPublicTeamMemberById(id);
  if (!existing) return null;

  const nextName = input.name?.trim() ?? existing.name;
  const nextSlug =
    nextName !== existing.name ? slugifyMemberName(nextName) : existing.slug;
  const nextInitials =
    input.initials?.trim() ||
    (input.name ? deriveInitials(nextName) : existing.initials);

  return withDb(async (query) => {
    const { rows } = await query<PublicTeamMemberRow>(
      `UPDATE public_team_members SET
        slug = $2,
        name = $3,
        role = $4,
        missions = $5,
        initials = $6,
        image = $7,
        image_alt = $8,
        image_position = $9,
        locale = $10,
        sort_order = $11,
        is_visible = $12,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        nextSlug,
        nextName,
        input.role?.trim() ?? existing.role,
        input.missions?.trim() ?? existing.missions,
        nextInitials,
        input.image?.trim() ?? existing.image,
        input.imageAlt?.trim() ?? existing.imageAlt,
        input.imagePosition !== undefined
          ? normalizeImagePosition(input.imagePosition)
          : existing.imagePosition,
        input.locale ?? existing.locale,
        input.sortOrder ?? existing.sortOrder,
        input.isVisible ?? existing.isVisible,
      ],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function deletePublicTeamMember(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM public_team_members WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function reorderPublicTeamMember(
  id: string,
  direction: "up" | "down",
): Promise<PublicTeamMemberRecord | null> {
  const member = await getPublicTeamMemberById(id);
  if (!member) return null;

  return withDb(async (query) => {
    const neighborComparator = direction === "up" ? "<" : ">";
    const neighborOrder = direction === "up" ? "DESC" : "ASC";

    const { rows: neighbors } = await query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM public_team_members
       WHERE locale = $1 AND sort_order ${neighborComparator} $2
       ORDER BY sort_order ${neighborOrder}
       LIMIT 1`,
      [member.locale, member.sortOrder],
    );

    const neighbor = neighbors[0];
    if (!neighbor) return member;

    await query(
      `UPDATE public_team_members SET sort_order = $2, updated_at = NOW() WHERE id = $1`,
      [member.id, neighbor.sort_order],
    );
    await query(
      `UPDATE public_team_members SET sort_order = $2, updated_at = NOW() WHERE id = $1`,
      [neighbor.id, member.sortOrder],
    );

    return getPublicTeamMemberById(id);
  });
}

export async function importStaticTeamMembers(): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < staticTeamMembers.length; i += 1) {
    const member = staticTeamMembers[i]!;
    try {
      await withDb(async (query) => {
        const { rows } = await query<{ id: string }>(
          `SELECT id FROM public_team_members WHERE slug = $1 LIMIT 1`,
          [member.id],
        );
        if (rows[0]) {
          skipped += 1;
          return;
        }

        await query(
          `INSERT INTO public_team_members (
            slug, name, role, missions, initials, image, image_alt, image_position, locale, sort_order, is_visible
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'fr', $9, true)`,
          [
            member.id,
            member.name,
            member.role,
            member.missions,
            member.initials,
            member.image,
            member.imageAlt,
            member.imagePosition ?? DEFAULT_IMAGE_POSITION,
            i,
          ],
        );
        imported += 1;
      });
    } catch {
      skipped += 1;
    }
  }

  return { imported, skipped };
}

export async function countPublicTeamMembers(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  return withDb(async (query) => {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM public_team_members`,
    );
    return Number(rows[0]?.count ?? 0);
  });
}
