import { cache } from "react";
import { unstable_cache } from "next/cache";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { DEFAULT_KADY_APPEARANCE, mergeKadyAppearance, type KadyAppearance } from "@/lib/kady-appearance";

export const KADY_APPEARANCE_TAG = "kady-appearance";

async function loadKadyAppearance(): Promise<KadyAppearance> {
  if (!isDatabaseConfigured()) return DEFAULT_KADY_APPEARANCE;
  try {
    return await withDb(async (query) => {
      const { rows } = await query<{ kady_appearance: unknown }>(`SELECT kady_appearance FROM crm_settings WHERE id = 1`);
      return mergeKadyAppearance(rows[0]?.kady_appearance ?? null);
    });
  } catch (error) {
    console.error("[kady-appearance] fallback:", error);
    return DEFAULT_KADY_APPEARANCE;
  }
}

/** Apparence publique — cache taggé, invalidé à l'enregistrement dans l'admin. */
export const getKadyAppearance = cache(async (): Promise<KadyAppearance> => {
  return unstable_cache(loadKadyAppearance, ["kady-appearance"], {
    tags: [KADY_APPEARANCE_TAG],
    revalidate: 300,
  })();
});

export async function getKadyAppearanceForAdmin(): Promise<KadyAppearance> {
  return loadKadyAppearance();
}

export async function updateKadyAppearance(input: KadyAppearance): Promise<KadyAppearance> {
  return withDb(async (query) => {
    await query(
      `INSERT INTO crm_settings (id, kady_appearance, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET kady_appearance = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(input)],
    );
    return mergeKadyAppearance(input);
  });
}
