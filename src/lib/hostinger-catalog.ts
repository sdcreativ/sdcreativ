import { isDatabaseConfigured, withDb } from "@/lib/db";
import { HOSTING_MONTH_OPTIONS, type HostingCatalogEntry } from "@/lib/pricing-display";

/** Catalogue officiel Hostinger (prix HT en centimes). Jeton : HOSTINGER_API_TOKEN. */
const CATALOG_URL = "https://developers.hostinger.com/api/billing/v1/catalog?category=HOSTING";

type ApiPrice = {
  currency?: string;
  price?: number;
  first_period_price?: number;
  period?: number;
  period_unit?: string;
};

type ApiItem = { id?: string; name?: string; category?: string; prices?: ApiPrice[] };

export type ParsedCatalogEntry = Omit<HostingCatalogEntry, "pending">;

const toMonths = (p: ApiPrice) =>
  p.period_unit === "year" ? (p.period ?? 0) * 12 : p.period_unit === "month" ? (p.period ?? 0) : 0;

/**
 * Réponse API → prix par pack et par durée proposée (12 / 24 / 48 mois). Le prix « normal »
 * barré = tarif mensuel sans engagement × durée (c'est ce qu'affiche le panier Hostinger).
 */
export function parseHostingCatalog(json: unknown): ParsedCatalogEntry[] {
  const items: ApiItem[] = Array.isArray(json) ? json : ((json as { data?: ApiItem[] })?.data ?? []);
  const entries: ParsedCatalogEntry[] = [];
  for (const item of items) {
    if (item.category !== "HOSTING" || !item.id || !Array.isArray(item.prices)) continue;
    const monthly = item.prices.find((p) => toMonths(p) === 1 && typeof p.price === "number");
    for (const price of item.prices) {
      const months = toMonths(price);
      if (!(HOSTING_MONTH_OPTIONS as readonly number[]).includes(months)) continue;
      if (typeof price.price !== "number" || typeof price.first_period_price !== "number") continue;
      entries.push({
        packId: item.id,
        packName: item.name ?? item.id,
        months,
        currency: price.currency ?? "EUR",
        promoCents: price.first_period_price,
        renewalCents: price.price,
        // Sans tarif mensuel publié, le prix de renouvellement de la période sert de référence.
        listCents: monthly ? (monthly.price as number) * months : price.price,
      });
    }
  }
  return entries;
}

export async function fetchHostingCatalog(token: string): Promise<ParsedCatalogEntry[]> {
  const res = await fetch(CATALOG_URL, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API Hostinger : HTTP ${res.status}`);
  return parseHostingCatalog(await res.json());
}

type Row = {
  pack_id: string;
  pack_name: string;
  months: number;
  currency: string;
  promo_cents: number;
  renewal_cents: number;
  list_cents: number;
  pending_promo_cents: number | null;
  pending_renewal_cents: number | null;
  pending_list_cents: number | null;
};

const mapRow = (r: Row): HostingCatalogEntry => ({
  packId: r.pack_id,
  packName: r.pack_name,
  months: r.months,
  currency: r.currency,
  promoCents: r.promo_cents,
  renewalCents: r.renewal_cents,
  listCents: r.list_cents,
  pending:
    r.pending_promo_cents != null && r.pending_renewal_cents != null && r.pending_list_cents != null
      ? { promoCents: r.pending_promo_cents, renewalCents: r.pending_renewal_cents, listCents: r.pending_list_cents }
      : null,
});

/** Prix appliqués (et changements en attente) du catalogue, triés par pack puis durée. */
export async function listHostingCatalog(): Promise<HostingCatalogEntry[]> {
  if (!isDatabaseConfigured()) return [];
  return withDb(async (query) => {
    const { rows } = await query<Row>(`SELECT * FROM hostinger_hosting_prices ORDER BY pack_name, months`);
    return rows.map(mapRow);
  });
}

export type CatalogChange = {
  packName: string;
  months: number;
  before: { promoCents: number; renewalCents: number; listCents: number };
  after: { promoCents: number; renewalCents: number; listCents: number };
};

/**
 * Synchronise le catalogue. Nouveau pack/durée : prix appliqués directement (aucune formule ne
 * l'utilise encore). Prix existant modifié : stocké « en attente », publié seulement après
 * validation dans l'admin. Retourne les changements en attente détectés lors de cette synchro.
 */
export async function syncHostingCatalog(entries: ParsedCatalogEntry[]): Promise<{
  packs: number;
  prices: number;
  /** Packs/durées ajoutés (1re synchro ou nouveau produit) : appliqués directement. */
  inserted: number;
  changes: CatalogChange[];
}> {
  const changes: CatalogChange[] = [];
  let inserted = 0;
  await withDb(async (query) => {
    for (const e of entries) {
      const { rows } = await query<Row>(
        `SELECT * FROM hostinger_hosting_prices WHERE pack_id = $1 AND months = $2`,
        [e.packId, e.months],
      );
      const existing = rows[0];
      if (!existing) {
        await query(
          `INSERT INTO hostinger_hosting_prices (pack_id, months, pack_name, currency, promo_cents, renewal_cents, list_cents)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [e.packId, e.months, e.packName, e.currency, e.promoCents, e.renewalCents, e.listCents],
        );
        inserted += 1;
        continue;
      }
      const same =
        existing.promo_cents === e.promoCents &&
        existing.renewal_cents === e.renewalCents &&
        existing.list_cents === e.listCents;
      if (same) {
        await query(
          `UPDATE hostinger_hosting_prices SET pack_name = $3, pending_promo_cents = NULL, pending_renewal_cents = NULL,
             pending_list_cents = NULL, fetched_at = NOW() WHERE pack_id = $1 AND months = $2`,
          [e.packId, e.months, e.packName],
        );
        continue;
      }
      const alreadyPending =
        existing.pending_promo_cents === e.promoCents &&
        existing.pending_renewal_cents === e.renewalCents &&
        existing.pending_list_cents === e.listCents;
      await query(
        `UPDATE hostinger_hosting_prices SET pack_name = $3, pending_promo_cents = $4, pending_renewal_cents = $5,
           pending_list_cents = $6, fetched_at = NOW() WHERE pack_id = $1 AND months = $2`,
        [e.packId, e.months, e.packName, e.promoCents, e.renewalCents, e.listCents],
      );
      // On ne signale qu'une fois le même changement (la synchro tourne chaque jour).
      if (!alreadyPending) {
        changes.push({
          packName: e.packName,
          months: e.months,
          before: { promoCents: existing.promo_cents, renewalCents: existing.renewal_cents, listCents: existing.list_cents },
          after: { promoCents: e.promoCents, renewalCents: e.renewalCents, listCents: e.listCents },
        });
      }
    }
    await query(
      `INSERT INTO crm_settings (id, pricing_hosting_catalog_synced_at, updated_at) VALUES (1, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET pricing_hosting_catalog_synced_at = NOW()`,
    );
  });
  return { packs: new Set(entries.map((e) => e.packId)).size, prices: entries.length, inserted, changes };
}

/** Valide les prix en attente : ils deviennent les prix appliqués. Retourne le nombre de lignes. */
export async function applyPendingHostingPrices(): Promise<number> {
  return withDb(async (query) => {
    const { rowCount } = await query(
      `UPDATE hostinger_hosting_prices
       SET promo_cents = pending_promo_cents, renewal_cents = pending_renewal_cents, list_cents = pending_list_cents,
           pending_promo_cents = NULL, pending_renewal_cents = NULL, pending_list_cents = NULL, applied_at = NOW()
       WHERE pending_promo_cents IS NOT NULL`,
    );
    return rowCount ?? 0;
  });
}

export async function getHostingCatalogSyncedAt(): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;
  return withDb(async (query) => {
    const { rows } = await query<{ synced: Date | null }>(
      `SELECT pricing_hosting_catalog_synced_at AS synced FROM crm_settings WHERE id = 1`,
    );
    return rows[0]?.synced ? rows[0].synced.toISOString() : null;
  });
}
