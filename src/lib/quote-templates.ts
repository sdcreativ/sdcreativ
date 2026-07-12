import { z } from "zod";
import {
  SERVICE_CATALOG_CATEGORIES,
  type ServiceCatalogCategory,
} from "@/content/service-catalog-labels";
import { withDb } from "@/lib/db";
import {
  composerLineFromCatalogItem,
  createComposerLine,
  type QuoteComposerLine,
} from "@/lib/quote-composer";
import { getServiceCatalogItemById } from "@/lib/service-catalog";

export type QuoteTemplateLine = {
  id: string;
  templateId: string;
  catalogItemId: string | null;
  label: string;
  quantity: number;
  unitPrice: number;
  sortOrder: number;
};

export type QuoteTemplate = {
  id: string;
  name: string;
  description: string | null;
  category: ServiceCatalogCategory;
  sortOrder: number;
  isActive: boolean;
  lineCount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  lines?: QuoteTemplateLine[];
};

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  category: ServiceCatalogCategory;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  line_count?: string;
  total_amount?: string;
};

type TemplateLineRow = {
  id: string;
  template_id: string;
  catalog_item_id: string | null;
  label: string;
  quantity: string;
  unit_price: number;
  sort_order: number;
};

const templateLineInputSchema = z.object({
  catalogItemId: z.string().uuid().optional().nullable(),
  label: z.string().trim().min(2).max(200),
  quantity: z.number().positive().max(9999).default(1),
  unitPrice: z.number().int().min(0),
});

export const createQuoteTemplateSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  category: z.enum(SERVICE_CATALOG_CATEGORIES).default("autre"),
  isActive: z.boolean().default(true),
  lines: z.array(templateLineInputSchema).min(1),
});

export const updateQuoteTemplateSchema = createQuoteTemplateSchema.partial();

function mapTemplateLine(row: TemplateLineRow): QuoteTemplateLine {
  return {
    id: row.id,
    templateId: row.template_id,
    catalogItemId: row.catalog_item_id,
    label: row.label,
    quantity: Number(row.quantity),
    unitPrice: row.unit_price,
    sortOrder: row.sort_order,
  };
}

function mapTemplate(row: TemplateRow, lines?: QuoteTemplateLine[]): QuoteTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    lineCount: Number(row.line_count ?? lines?.length ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lines,
  };
}

export async function listQuoteTemplates(options?: {
  activeOnly?: boolean;
}): Promise<QuoteTemplate[]> {
  return withDb(async (query) => {
    const conditions = options?.activeOnly ? "WHERE t.is_active = true" : "";
    const { rows } = await query<TemplateRow>(
      `SELECT t.*,
        COUNT(l.id)::text AS line_count,
        COALESCE(SUM(ROUND(l.quantity * l.unit_price)), 0)::text AS total_amount
       FROM crm_quote_templates t
       LEFT JOIN crm_quote_template_lines l ON l.template_id = t.id
       ${conditions}
       GROUP BY t.id
       ORDER BY t.sort_order ASC, t.name ASC`,
    );
    return rows.map((row) => mapTemplate(row));
  });
}

export async function getQuoteTemplateById(id: string): Promise<QuoteTemplate | null> {
  return withDb(async (query) => {
    const { rows } = await query<TemplateRow>(
      `SELECT t.*,
        COUNT(l.id)::text AS line_count,
        COALESCE(SUM(ROUND(l.quantity * l.unit_price)), 0)::text AS total_amount
       FROM crm_quote_templates t
       LEFT JOIN crm_quote_template_lines l ON l.template_id = t.id
       WHERE t.id = $1
       GROUP BY t.id`,
      [id],
    );
    if (!rows[0]) return null;

    const { rows: lineRows } = await query<TemplateLineRow>(
      `SELECT * FROM crm_quote_template_lines WHERE template_id = $1 ORDER BY sort_order ASC, label ASC`,
      [id],
    );
    return mapTemplate(rows[0], lineRows.map(mapTemplateLine));
  });
}

async function insertTemplateLines(
  query: (text: string, params?: unknown[]) => Promise<{ rowCount: number | null }>,
  templateId: string,
  lines: z.infer<typeof templateLineInputSchema>[],
): Promise<void> {
  await query(`DELETE FROM crm_quote_template_lines WHERE template_id = $1`, [templateId]);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    await query(
      `INSERT INTO crm_quote_template_lines
        (template_id, catalog_item_id, label, quantity, unit_price, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [templateId, line.catalogItemId ?? null, line.label, line.quantity, line.unitPrice, i],
    );
  }
}

export async function createQuoteTemplate(
  input: z.infer<typeof createQuoteTemplateSchema>,
): Promise<QuoteTemplate> {
  return withDb(async (query) => {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO crm_quote_templates (name, description, category, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [input.name, input.description ?? null, input.category, input.isActive],
    );
    const id = rows[0]!.id;
    await insertTemplateLines(query, id, input.lines);
    const created = await getQuoteTemplateById(id);
    if (!created) throw new Error("Modèle introuvable après création.");
    return created;
  });
}

export async function updateQuoteTemplate(
  id: string,
  input: z.infer<typeof updateQuoteTemplateSchema>,
): Promise<QuoteTemplate> {
  return withDb(async (query) => {
    const existing = await getQuoteTemplateById(id);
    if (!existing) throw new Error("Modèle introuvable.");

    const fields: string[] = [];
    const params: unknown[] = [id];
    let idx = 2;

    if (input.name !== undefined) {
      fields.push(`name = $${idx++}`);
      params.push(input.name);
    }
    if (input.description !== undefined) {
      fields.push(`description = $${idx++}`);
      params.push(input.description);
    }
    if (input.category !== undefined) {
      fields.push(`category = $${idx++}`);
      params.push(input.category);
    }
    if (input.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      params.push(input.isActive);
    }

    if (fields.length > 0) {
      fields.push("updated_at = NOW()");
      await query(`UPDATE crm_quote_templates SET ${fields.join(", ")} WHERE id = $1`, params);
    }

    if (input.lines) {
      await insertTemplateLines(query, id, input.lines);
      await query(`UPDATE crm_quote_templates SET updated_at = NOW() WHERE id = $1`, [id]);
    }

    const updated = await getQuoteTemplateById(id);
    if (!updated) throw new Error("Modèle introuvable.");
    return updated;
  });
}

export async function deleteQuoteTemplate(id: string): Promise<void> {
  await withDb(async (query) => {
    await query(`DELETE FROM crm_quote_templates WHERE id = $1`, [id]);
  });
}

export async function templateToComposerLines(template: QuoteTemplate): Promise<QuoteComposerLine[]> {
  const lines = template.lines ?? [];
  const result: QuoteComposerLine[] = [];

  for (const line of lines) {
    if (line.catalogItemId) {
      const catalogItem = await getServiceCatalogItemById(line.catalogItemId);
      if (catalogItem) {
        const composed = composerLineFromCatalogItem(catalogItem);
        composed.quantity = line.quantity;
        composed.unitPrice = line.unitPrice;
        result.push(composed);
        continue;
      }
    }
    result.push(
      createComposerLine({
        catalogItemId: line.catalogItemId ?? undefined,
        label: line.label,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      }),
    );
  }

  return result;
}

const DEFAULT_TEMPLATES: Array<{
  name: string;
  description: string;
  category: ServiceCatalogCategory;
  lines: Array<{ label: string; quantity: number; unitPrice: number }>;
}> = [
  {
    name: "Site vitrine standard",
    description: "Pack site vitrine 5 pages + SEO de base + formation",
    category: "site-web",
    lines: [
      { label: "Conception & design UI", quantity: 1, unitPrice: 350_000 },
      { label: "Développement site vitrine (5 pages)", quantity: 1, unitPrice: 650_000 },
      { label: "SEO technique de base", quantity: 1, unitPrice: 150_000 },
      { label: "Formation prise en main", quantity: 1, unitPrice: 75_000 },
    ],
  },
  {
    name: "Refonte e-commerce",
    description: "Refonte boutique en ligne + catalogue produits + paiement",
    category: "site-web",
    lines: [
      { label: "Audit & cahier des charges", quantity: 1, unitPrice: 200_000 },
      { label: "Design UX/UI e-commerce", quantity: 1, unitPrice: 450_000 },
      { label: "Développement boutique WooCommerce", quantity: 1, unitPrice: 1_200_000 },
      { label: "Intégration paiement en ligne", quantity: 1, unitPrice: 250_000 },
      { label: "Tests & mise en production", quantity: 1, unitPrice: 150_000 },
    ],
  },
  {
    name: "Maintenance mensuelle",
    description: "Forfait maintenance & support technique",
    category: "maintenance",
    lines: [
      { label: "Maintenance corrective & mises à jour", quantity: 1, unitPrice: 75_000 },
      { label: "Sauvegardes & monitoring", quantity: 1, unitPrice: 35_000 },
      { label: "Support technique (2 h/mois)", quantity: 1, unitPrice: 40_000 },
    ],
  },
];

export async function seedQuoteTemplates(
  query: <R extends Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: R[]; rowCount: number | null }>,
): Promise<void> {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM crm_quote_templates`,
  );
  if (Number(rows[0]?.count ?? 0) > 0) return;

  for (let t = 0; t < DEFAULT_TEMPLATES.length; t++) {
    const pack = DEFAULT_TEMPLATES[t]!;
    const { rows: inserted } = await query<{ id: string }>(
      `INSERT INTO crm_quote_templates (name, description, category, sort_order, is_active)
       VALUES ($1, $2, $3, $4, true) RETURNING id`,
      [pack.name, pack.description, pack.category, t],
    );
    const templateId = inserted[0]!.id;
    for (let i = 0; i < pack.lines.length; i++) {
      const line = pack.lines[i]!;
      await query(
        `INSERT INTO crm_quote_template_lines (template_id, label, quantity, unit_price, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [templateId, line.label, line.quantity, line.unitPrice, i],
      );
    }
  }
}
