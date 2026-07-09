import { z } from "zod";
import { serviceDetails } from "@/content/service-details";
import { services as staticServices } from "@/content/services";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { LUCIDE_ICON_NAME_ENUM, lucideIconName } from "@/lib/lucide-icon-map";
import type { PublicServiceRecord, StoredServiceDetail } from "@/lib/public-services-types";

type PublicServiceRow = {
  id: string;
  slug: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  image: string | null;
  image_alt: string | null;
  detail_href: string | null;
  detail_label: string | null;
  detail: StoredServiceDetail | null;
  sort_order: number;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: PublicServiceRow): PublicServiceRecord {
  return {
    id: row.id,
    slug: row.slug,
    icon: row.icon,
    title: row.title,
    description: row.description,
    features: row.features,
    image: row.image ?? undefined,
    imageAlt: row.image_alt ?? undefined,
    detailHref: row.detail_href ?? undefined,
    detailLabel: row.detail_label ?? undefined,
    detail: row.detail,
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const serviceProcessStepSchema = z.object({
  step: z.string().trim().min(1).max(4),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(5).max(500),
});

const serviceFaqSchema = z.object({
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(10).max(2000),
});

export const storedServiceDetailSchema = z.object({
  metaDescription: z.string().trim().min(10).max(320),
  heroDescription: z.string().trim().min(10).max(600),
  startingFrom: z.string().trim().min(1).max(80),
  delay: z.string().trim().min(1).max(80),
  problem: z.object({
    title: z.string().trim().min(1).max(200),
    text: z.string().trim().min(10).max(1000),
  }),
  solution: z.object({
    title: z.string().trim().min(1).max(200),
    text: z.string().trim().min(10).max(1000),
  }),
  deliverables: z.array(z.string().trim().min(1).max(200)).min(1).max(30),
  process: z.array(serviceProcessStepSchema).min(1).max(12),
  idealFor: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
  faq: z.array(serviceFaqSchema).max(20),
  relatedRealisationIds: z.array(z.string().trim().min(1).max(80)).max(10),
});

export const createPublicServiceSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug invalide (a-z, 0-9, tirets)."),
  icon: z.enum(LUCIDE_ICON_NAME_ENUM),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(600),
  features: z.array(z.string().trim().min(1).max(120)).min(1).max(15),
  image: z.string().trim().max(512).optional(),
  imageAlt: z.string().trim().max(300).optional(),
  detailHref: z.string().trim().max(200).optional(),
  detailLabel: z.string().trim().max(120).optional(),
  detail: storedServiceDetailSchema.nullable().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isVisible: z.boolean().default(true),
});

export const updatePublicServiceSchema = createPublicServiceSchema.partial();

export async function listPublicServices(options?: {
  visibleOnly?: boolean;
}): Promise<PublicServiceRecord[]> {
  if (!isDatabaseConfigured()) return [];

  return withDb(async (query) => {
    const where = options?.visibleOnly ? "WHERE is_visible = true" : "";
    const { rows } = await query<PublicServiceRow>(
      `SELECT * FROM public_services ${where} ORDER BY sort_order ASC, title ASC`,
    );
    return rows.map(mapRow);
  });
}

export async function getPublicServiceById(id: string): Promise<PublicServiceRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<PublicServiceRow>(
      `SELECT * FROM public_services WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function getPublicServiceBySlug(slug: string): Promise<PublicServiceRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<PublicServiceRow>(
      `SELECT * FROM public_services WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function createPublicService(
  input: z.infer<typeof createPublicServiceSchema>,
): Promise<PublicServiceRecord> {
  return withDb(async (query) => {
    const sortOrder =
      input.sortOrder ??
      (await query<{ next: number }>(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM public_services`,
      )).rows[0]?.next ??
      0;

    const { rows } = await query<PublicServiceRow>(
      `INSERT INTO public_services (
        slug, icon, title, description, features, image, image_alt,
        detail_href, detail_label, detail, sort_order, is_visible
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12)
      RETURNING *`,
      [
        input.slug,
        input.icon,
        input.title,
        input.description,
        input.features,
        input.image ?? null,
        input.imageAlt ?? null,
        input.detailHref ?? null,
        input.detailLabel ?? null,
        input.detail ? JSON.stringify(input.detail) : null,
        sortOrder,
        input.isVisible,
      ],
    );
    return mapRow(rows[0]!);
  });
}

export async function updatePublicService(
  id: string,
  input: z.infer<typeof updatePublicServiceSchema>,
): Promise<PublicServiceRecord | null> {
  const existing = await getPublicServiceById(id);
  if (!existing) return null;

  return withDb(async (query) => {
    const nextDetail =
      input.detail === undefined
        ? existing.detail
        : input.detail === null
          ? null
          : input.detail;

    const { rows } = await query<PublicServiceRow>(
      `UPDATE public_services SET
        slug = $2, icon = $3, title = $4, description = $5, features = $6,
        image = $7, image_alt = $8, detail_href = $9, detail_label = $10,
        detail = $11::jsonb, sort_order = $12, is_visible = $13, updated_at = NOW()
      WHERE id = $1 RETURNING *`,
      [
        id,
        input.slug ?? existing.slug,
        input.icon ?? existing.icon,
        input.title ?? existing.title,
        input.description ?? existing.description,
        input.features ?? existing.features,
        input.image !== undefined ? input.image || null : existing.image ?? null,
        input.imageAlt !== undefined ? input.imageAlt || null : existing.imageAlt ?? null,
        input.detailHref !== undefined ? input.detailHref || null : existing.detailHref ?? null,
        input.detailLabel !== undefined ? input.detailLabel || null : existing.detailLabel ?? null,
        nextDetail ? JSON.stringify(nextDetail) : null,
        input.sortOrder ?? existing.sortOrder,
        input.isVisible ?? existing.isVisible,
      ],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function deletePublicService(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM public_services WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function reorderPublicService(
  id: string,
  direction: "up" | "down",
): Promise<PublicServiceRecord | null> {
  const item = await getPublicServiceById(id);
  if (!item) return null;

  return withDb(async (query) => {
    const neighborComparator = direction === "up" ? "<" : ">";
    const neighborOrder = direction === "up" ? "DESC" : "ASC";

    const { rows: neighbors } = await query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM public_services
       WHERE sort_order ${neighborComparator} $1
       ORDER BY sort_order ${neighborOrder} LIMIT 1`,
      [item.sortOrder],
    );

    const neighbor = neighbors[0];
    if (!neighbor) return item;

    await query(`UPDATE public_services SET sort_order = $2, updated_at = NOW() WHERE id = $1`, [
      item.id,
      neighbor.sort_order,
    ]);
    await query(`UPDATE public_services SET sort_order = $2, updated_at = NOW() WHERE id = $1`, [
      neighbor.id,
      item.sortOrder,
    ]);

    return getPublicServiceById(id);
  });
}

export async function importStaticServices(): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < staticServices.length; i += 1) {
    const service = staticServices[i]!;
    const detail = serviceDetails.find((d) => d.id === service.id);
    const slug = service.id;

    try {
      await withDb(async (query) => {
        const { rows } = await query<{ id: string }>(
          `SELECT id FROM public_services WHERE slug = $1 LIMIT 1`,
          [slug],
        );
        if (rows[0]) {
          skipped += 1;
          return;
        }

        const { id: _id, ...detailBody } = detail ?? { id: slug };

        await query(
          `INSERT INTO public_services (
            slug, icon, title, description, features, image, image_alt,
            detail_href, detail_label, detail, sort_order, is_visible
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, true)`,
          [
            slug,
            lucideIconName(service.icon),
            service.title,
            service.description,
            service.features,
            service.image ?? null,
            service.imageAlt ?? null,
            service.detailHref ?? null,
            service.detailLabel ?? null,
            detail ? JSON.stringify(detailBody) : null,
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

