import { z } from "zod";
import { technologyPartners as staticPartners } from "@/content/partners";
import { slugifyBlogTitle } from "@/lib/blog-posts-types";
import { isDatabaseConfigured, withDb } from "@/lib/db";

export type PublicPartnerRecord = {
  id: string;
  slug: string;
  name: string;
  category: string;
  locale: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TechnologyPartner = {
  name: string;
  category: string;
};

type PublicPartnerRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  locale: string;
  sort_order: number;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: PublicPartnerRow): PublicPartnerRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    locale: row.locale,
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toTechnologyPartner(record: PublicPartnerRecord): TechnologyPartner {
  return { name: record.name, category: record.category };
}

function slugifyPartner(name: string): string {
  return slugifyBlogTitle(name).slice(0, 120) || "partenaire";
}

export const createPublicPartnerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(80),
  locale: z.enum(["fr", "en"]).default("fr"),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isVisible: z.boolean().default(true),
});

export const updatePublicPartnerSchema = createPublicPartnerSchema.partial();

export async function listPublicPartners(options?: {
  locale?: string;
  visibleOnly?: boolean;
}): Promise<PublicPartnerRecord[]> {
  if (!isDatabaseConfigured()) return [];

  return withDb(async (query) => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (options?.locale) {
      params.push(options.locale);
      conditions.push(`locale = $${params.length}`);
    }
    if (options?.visibleOnly) conditions.push("is_visible = true");
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query<PublicPartnerRow>(
      `SELECT * FROM public_partners ${where} ORDER BY sort_order ASC, name ASC`,
      params,
    );
    return rows.map(mapRow);
  });
}

export async function getPublicPartnerById(id: string): Promise<PublicPartnerRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<PublicPartnerRow>(
      `SELECT * FROM public_partners WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function createPublicPartner(
  input: z.infer<typeof createPublicPartnerSchema>,
): Promise<PublicPartnerRecord> {
  const name = input.name.trim();
  const slug = slugifyPartner(name);

  return withDb(async (query) => {
    const sortOrder =
      input.sortOrder ??
      (await query<{ next: number }>(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM public_partners WHERE locale = $1`,
        [input.locale],
      )).rows[0]?.next ??
      0;

    const { rows } = await query<PublicPartnerRow>(
      `INSERT INTO public_partners (slug, name, category, locale, sort_order, is_visible)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [slug, name, input.category.trim(), input.locale, sortOrder, input.isVisible],
    );
    return mapRow(rows[0]!);
  });
}

export async function updatePublicPartner(
  id: string,
  input: z.infer<typeof updatePublicPartnerSchema>,
): Promise<PublicPartnerRecord | null> {
  const existing = await getPublicPartnerById(id);
  if (!existing) return null;

  const nextName = input.name?.trim() ?? existing.name;
  const nextSlug = nextName !== existing.name ? slugifyPartner(nextName) : existing.slug;

  return withDb(async (query) => {
    const { rows } = await query<PublicPartnerRow>(
      `UPDATE public_partners SET slug=$2, name=$3, category=$4, locale=$5,
        sort_order=$6, is_visible=$7, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [
        id,
        nextSlug,
        nextName,
        input.category?.trim() ?? existing.category,
        input.locale ?? existing.locale,
        input.sortOrder ?? existing.sortOrder,
        input.isVisible ?? existing.isVisible,
      ],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function deletePublicPartner(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM public_partners WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function reorderPublicPartner(
  id: string,
  direction: "up" | "down",
): Promise<PublicPartnerRecord | null> {
  const item = await getPublicPartnerById(id);
  if (!item) return null;

  return withDb(async (query) => {
    const cmp = direction === "up" ? "<" : ">";
    const ord = direction === "up" ? "DESC" : "ASC";
    const { rows: neighbors } = await query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM public_partners WHERE locale=$1 AND sort_order ${cmp} $2
       ORDER BY sort_order ${ord} LIMIT 1`,
      [item.locale, item.sortOrder],
    );
    const neighbor = neighbors[0];
    if (!neighbor) return item;

    await query(`UPDATE public_partners SET sort_order=$2, updated_at=NOW() WHERE id=$1`, [
      item.id,
      neighbor.sort_order,
    ]);
    await query(`UPDATE public_partners SET sort_order=$2, updated_at=NOW() WHERE id=$1`, [
      neighbor.id,
      item.sortOrder,
    ]);
    return getPublicPartnerById(id);
  });
}

export async function importStaticPartners(): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < staticPartners.length; i += 1) {
    const partner = staticPartners[i]!;
    const slug = slugifyPartner(partner.name);
    try {
      await withDb(async (query) => {
        const { rows } = await query<{ id: string }>(
          `SELECT id FROM public_partners WHERE slug = $1 LIMIT 1`,
          [slug],
        );
        if (rows[0]) {
          skipped += 1;
          return;
        }
        await query(
          `INSERT INTO public_partners (slug, name, category, locale, sort_order, is_visible)
           VALUES ($1, $2, $3, 'fr', $4, true)`,
          [slug, partner.name, partner.category, i],
        );
        imported += 1;
      });
    } catch {
      skipped += 1;
    }
  }

  return { imported, skipped };
}
