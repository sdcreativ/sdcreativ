import { z } from "zod";
import {
  SERVICE_CATALOG_CATEGORIES,
  SERVICE_CATALOG_UNITS,
  type ServiceCatalogCategory,
  type ServiceCatalogUnit,
} from "@/content/service-catalog-labels";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { getSiteQuoteConfigSettings } from "@/lib/site-quote-config-settings";

export type ServiceCatalogItem = {
  id: string;
  name: string;
  description: string | null;
  category: ServiceCatalogCategory;
  unit: ServiceCatalogUnit;
  unitPrice: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ServiceCatalogRow = {
  id: string;
  name: string;
  description: string | null;
  category: ServiceCatalogCategory;
  unit: ServiceCatalogUnit;
  unit_price: number;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

function mapServiceCatalogItem(row: ServiceCatalogRow): ServiceCatalogItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    unit: row.unit,
    unitPrice: row.unit_price,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const createServiceCatalogSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  category: z.enum(SERVICE_CATALOG_CATEGORIES).default("autre"),
  unit: z.enum(SERVICE_CATALOG_UNITS).default("forfait"),
  unitPrice: z.number().int().min(0),
  isActive: z.boolean().default(true),
});

export const updateServiceCatalogSchema = createServiceCatalogSchema.partial();

function projectCategory(projectId: string): ServiceCatalogCategory {
  if (projectId.includes("seo")) return "seo";
  if (projectId.includes("identite")) return "identite";
  if (projectId.includes("maintenance")) return "maintenance";
  if (projectId.includes("ia") || projectId.includes("agents")) return "ia";
  if (projectId.includes("devops") || projectId.includes("cloud")) return "devops";
  if (
    projectId.includes("site") ||
    projectId.includes("e-commerce") ||
    projectId.includes("refonte") ||
    projectId.includes("mobile") ||
    projectId.includes("developpement")
  ) {
    return "site-web";
  }
  return "autre";
}

function addonCategory(addonId: string): ServiceCatalogCategory {
  if (addonId.includes("seo") || addonId.includes("analytics")) return "seo";
  if (addonId.includes("maintenance") || addonId.includes("securite") || addonId.includes("hebergement")) {
    return "maintenance";
  }
  if (addonId.includes("ia") || addonId.includes("live-chat") || addonId.includes("agents")) return "ia";
  if (addonId.includes("photo") || addonId.includes("redaction") || addonId.includes("ui-ux")) {
    return "identite";
  }
  return "site-web";
}

export async function listServiceCatalogItems(options?: {
  activeOnly?: boolean;
}): Promise<ServiceCatalogItem[]> {
  return withDb(async (query) => {
    const conditions = options?.activeOnly ? "WHERE is_active = true" : "";
    const { rows } = await query<ServiceCatalogRow>(
      `SELECT * FROM crm_service_catalog ${conditions} ORDER BY sort_order ASC, name ASC`,
    );
    return rows.map(mapServiceCatalogItem);
  });
}

export async function getServiceCatalogItemById(id: string): Promise<ServiceCatalogItem | null> {
  return withDb(async (query) => {
    const { rows } = await query<ServiceCatalogRow>(
      `SELECT * FROM crm_service_catalog WHERE id = $1`,
      [id],
    );
    return rows[0] ? mapServiceCatalogItem(rows[0]) : null;
  });
}

export async function createServiceCatalogItem(
  input: z.infer<typeof createServiceCatalogSchema>,
): Promise<ServiceCatalogItem> {
  return withDb(async (query) => {
    const { rows: orderRows } = await query<{ max: number | null }>(
      `SELECT MAX(sort_order) AS max FROM crm_service_catalog`,
    );
    const sortOrder = (orderRows[0]?.max ?? -1) + 1;

    const { rows } = await query<ServiceCatalogRow>(
      `INSERT INTO crm_service_catalog (
        name, description, category, unit, unit_price, sort_order, is_active
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        input.name,
        input.description ?? null,
        input.category,
        input.unit,
        input.unitPrice,
        sortOrder,
        input.isActive,
      ],
    );
    return mapServiceCatalogItem(rows[0]!);
  });
}

export async function updateServiceCatalogItem(
  id: string,
  input: z.infer<typeof updateServiceCatalogSchema>,
): Promise<ServiceCatalogItem | null> {
  return withDb(async (query) => {
    const existing = await getServiceCatalogItemById(id);
    if (!existing) return null;

    const { rows } = await query<ServiceCatalogRow>(
      `UPDATE crm_service_catalog SET
        name = $2,
        description = $3,
        category = $4,
        unit = $5,
        unit_price = $6,
        is_active = $7,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        input.name ?? existing.name,
        input.description !== undefined ? input.description : existing.description,
        input.category ?? existing.category,
        input.unit ?? existing.unit,
        input.unitPrice ?? existing.unitPrice,
        input.isActive ?? existing.isActive,
      ],
    );
    return rows[0] ? mapServiceCatalogItem(rows[0]) : null;
  });
}

export async function deleteServiceCatalogItem(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM crm_service_catalog WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function reorderServiceCatalogItem(
  id: string,
  direction: "up" | "down",
): Promise<ServiceCatalogItem | null> {
  return withDb(async (query) => {
    const { rows } = await query<ServiceCatalogRow>(
      `SELECT * FROM crm_service_catalog ORDER BY sort_order ASC, name ASC`,
    );
    const items = rows.map(mapServiceCatalogItem);
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return null;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return items[index] ?? null;

    const current = items[index]!;
    const other = items[swapIndex]!;

    await query(`UPDATE crm_service_catalog SET sort_order = $2, updated_at = NOW() WHERE id = $1`, [
      current.id,
      other.sortOrder,
    ]);
    await query(`UPDATE crm_service_catalog SET sort_order = $2, updated_at = NOW() WHERE id = $1`, [
      other.id,
      current.sortOrder,
    ]);

    const { rows: updatedRows } = await query<ServiceCatalogRow>(
      `SELECT * FROM crm_service_catalog WHERE id = $1`,
      [id],
    );
    return updatedRows[0] ? mapServiceCatalogItem(updatedRows[0]) : null;
  });
}

export async function importServiceCatalogFromQuoteConfig(): Promise<{
  imported: number;
  updated: number;
}> {
  if (!isDatabaseConfigured()) return { imported: 0, updated: 0 };

  const config = await getSiteQuoteConfigSettings();
  const existing = await listServiceCatalogItems();
  const byName = new Map(existing.map((item) => [item.name.trim().toLowerCase(), item]));

  const candidates: Array<{
    name: string;
    description: string | null;
    category: ServiceCatalogCategory;
    unit: ServiceCatalogUnit;
    unitPrice: number;
  }> = [];

  for (const project of config.projectTypes) {
    candidates.push({
      name: project.label,
      description: "Type de projet — configurateur public",
      category: projectCategory(project.id),
      unit: "forfait",
      unitPrice: project.basePrice,
    });
  }

  for (const tier of config.pageTiers) {
    if (tier.extraPrice <= 0) continue;
    candidates.push({
      name: tier.label,
      description: "Palier de pages — configurateur public",
      category: "site-web",
      unit: "forfait",
      unitPrice: tier.extraPrice,
    });
  }

  for (const addon of config.addons) {
    candidates.push({
      name: addon.label,
      description: "Option — configurateur public",
      category: addonCategory(addon.id),
      unit: "forfait",
      unitPrice: addon.price,
    });
  }

  let imported = 0;
  let updated = 0;
  for (const candidate of candidates) {
    const key = candidate.name.trim().toLowerCase();
    const current = byName.get(key);
    if (!current) {
      const created = await createServiceCatalogItem({
        name: candidate.name,
        description: candidate.description,
        category: candidate.category,
        unit: candidate.unit,
        unitPrice: candidate.unitPrice,
        isActive: true,
      });
      byName.set(key, created);
      imported += 1;
      continue;
    }

    if (
      current.unitPrice !== candidate.unitPrice ||
      current.category !== candidate.category ||
      current.description !== candidate.description
    ) {
      await updateServiceCatalogItem(current.id, {
        unitPrice: candidate.unitPrice,
        category: candidate.category,
        description: candidate.description,
        isActive: true,
      });
      updated += 1;
    }
  }

  return { imported, updated };
}
