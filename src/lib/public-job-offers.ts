import { z } from "zod";
import { jobOffers as staticJobOffers } from "@/content/carrieres";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import type { PublicJobOfferRecord } from "@/lib/public-job-offers-types";

type PublicJobOfferRow = {
  id: string;
  slug: string;
  title: string;
  type: string;
  location: string;
  department: string;
  description: string;
  missions: string[];
  profile: string[];
  sort_order: number;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: PublicJobOfferRow): PublicJobOfferRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: row.type,
    location: row.location,
    department: row.department,
    description: row.description,
    missions: row.missions,
    profile: row.profile,
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const createPublicJobOfferSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug invalide."),
  title: z.string().trim().min(2).max(160),
  type: z.string().trim().min(1).max(80),
  location: z.string().trim().min(2).max(160),
  department: z.string().trim().min(1).max(80),
  description: z.string().trim().min(10).max(1000),
  missions: z.array(z.string().trim().min(1).max(300)).min(1).max(20),
  profile: z.array(z.string().trim().min(1).max(300)).min(1).max(20),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isVisible: z.boolean().default(true),
});

export const updatePublicJobOfferSchema = createPublicJobOfferSchema.partial();

export async function listPublicJobOffers(options?: {
  visibleOnly?: boolean;
}): Promise<PublicJobOfferRecord[]> {
  if (!isDatabaseConfigured()) return [];

  return withDb(async (query) => {
    const where = options?.visibleOnly ? "WHERE is_visible = true" : "";
    const { rows } = await query<PublicJobOfferRow>(
      `SELECT * FROM public_job_offers ${where} ORDER BY sort_order ASC, title ASC`,
    );
    return rows.map(mapRow);
  });
}

export async function getPublicJobOfferById(id: string): Promise<PublicJobOfferRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<PublicJobOfferRow>(
      `SELECT * FROM public_job_offers WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function getPublicJobOfferBySlug(slug: string): Promise<PublicJobOfferRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<PublicJobOfferRow>(
      `SELECT * FROM public_job_offers WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function createPublicJobOffer(
  input: z.infer<typeof createPublicJobOfferSchema>,
): Promise<PublicJobOfferRecord> {
  return withDb(async (query) => {
    const sortOrder =
      input.sortOrder ??
      (await query<{ next: number }>(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM public_job_offers`,
      )).rows[0]?.next ??
      0;

    const { rows } = await query<PublicJobOfferRow>(
      `INSERT INTO public_job_offers (
        slug, title, type, location, department, description, missions, profile, sort_order, is_visible
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        input.slug,
        input.title,
        input.type,
        input.location,
        input.department,
        input.description,
        input.missions,
        input.profile,
        sortOrder,
        input.isVisible,
      ],
    );
    return mapRow(rows[0]!);
  });
}

export async function updatePublicJobOffer(
  id: string,
  input: z.infer<typeof updatePublicJobOfferSchema>,
): Promise<PublicJobOfferRecord | null> {
  const existing = await getPublicJobOfferById(id);
  if (!existing) return null;

  return withDb(async (query) => {
    const { rows } = await query<PublicJobOfferRow>(
      `UPDATE public_job_offers SET
        slug = $2, title = $3, type = $4, location = $5, department = $6,
        description = $7, missions = $8, profile = $9, sort_order = $10,
        is_visible = $11, updated_at = NOW()
      WHERE id = $1 RETURNING *`,
      [
        id,
        input.slug ?? existing.slug,
        input.title ?? existing.title,
        input.type ?? existing.type,
        input.location ?? existing.location,
        input.department ?? existing.department,
        input.description ?? existing.description,
        input.missions ?? existing.missions,
        input.profile ?? existing.profile,
        input.sortOrder ?? existing.sortOrder,
        input.isVisible ?? existing.isVisible,
      ],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function deletePublicJobOffer(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM public_job_offers WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function reorderPublicJobOffer(
  id: string,
  direction: "up" | "down",
): Promise<PublicJobOfferRecord | null> {
  const item = await getPublicJobOfferById(id);
  if (!item) return null;

  return withDb(async (query) => {
    const neighborComparator = direction === "up" ? "<" : ">";
    const neighborOrder = direction === "up" ? "DESC" : "ASC";

    const { rows: neighbors } = await query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM public_job_offers
       WHERE sort_order ${neighborComparator} $1
       ORDER BY sort_order ${neighborOrder} LIMIT 1`,
      [item.sortOrder],
    );

    const neighbor = neighbors[0];
    if (!neighbor) return item;

    await query(`UPDATE public_job_offers SET sort_order = $2, updated_at = NOW() WHERE id = $1`, [
      item.id,
      neighbor.sort_order,
    ]);
    await query(`UPDATE public_job_offers SET sort_order = $2, updated_at = NOW() WHERE id = $1`, [
      neighbor.id,
      item.sortOrder,
    ]);

    return getPublicJobOfferById(id);
  });
}

export async function importStaticJobOffers(): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < staticJobOffers.length; i += 1) {
    const job = staticJobOffers[i]!;
    try {
      await withDb(async (query) => {
        const { rows } = await query<{ id: string }>(
          `SELECT id FROM public_job_offers WHERE slug = $1 LIMIT 1`,
          [job.id],
        );
        if (rows[0]) {
          skipped += 1;
          return;
        }

        await query(
          `INSERT INTO public_job_offers (
            slug, title, type, location, department, description, missions, profile, sort_order, is_visible
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
          [
            job.id,
            job.title,
            job.type,
            job.location,
            job.department,
            job.description,
            job.missions,
            job.profile,
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

