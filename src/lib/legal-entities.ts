import { z } from "zod";
import { withDb } from "@/lib/db";
import type { SupportedCurrency } from "@/lib/currencies";
import { normalizeCurrency } from "@/lib/currencies";

export type LegalEntity = {
  id: string;
  name: string;
  slug: string;
  currency: SupportedCurrency;
  address: string | null;
  createdAt: string;
};

type LegalEntityRow = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  address: string | null;
  created_at: Date;
};

function mapLegalEntity(row: LegalEntityRow): LegalEntity {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    currency: normalizeCurrency(row.currency),
    address: row.address,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listLegalEntities(): Promise<LegalEntity[]> {
  return withDb(async (query) => {
    const { rows } = await query<LegalEntityRow>(
      `SELECT id, name, slug, currency, address, created_at FROM legal_entities ORDER BY name ASC`,
    );
    return rows.map(mapLegalEntity);
  });
}

export const createLegalEntitySchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  currency: z.string().length(3).optional(),
  address: z.string().trim().max(500).optional().nullable(),
});

export async function createLegalEntity(
  input: z.infer<typeof createLegalEntitySchema>,
): Promise<LegalEntity> {
  return withDb(async (query) => {
    const { rows } = await query<LegalEntityRow>(
      `INSERT INTO legal_entities (name, slug, currency, address)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, slug, currency, address, created_at`,
      [input.name, input.slug, normalizeCurrency(input.currency), input.address ?? null],
    );
    return mapLegalEntity(rows[0]!);
  });
}

export async function seedLegalEntities(
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }>,
): Promise<void> {
  const { rows } = await query(`SELECT COUNT(*)::text AS count FROM legal_entities`);
  if (Number((rows[0] as { count: string })?.count ?? 0) > 0) return;

  await query(
    `INSERT INTO legal_entities (name, slug, currency, address)
     VALUES ($1, $2, $3, $4)`,
    ["SD CREATIV", "sd-creativ", "XOF", "Abidjan, Côte d'Ivoire"],
  );
}
