/** Taille de page max côté listes CRM (clamp serveur). */
export const CRM_MAX_PAGE_SIZE = 100;

/**
 * Agrège toutes les pages d’une liste paginée (exports, détection doublons).
 * Ne jamais utiliser côté widgets dashboard — préférer des endpoints agrégés.
 */
export async function paginateAll<T>(
  fetchPage: (page: number, pageSize: number) => Promise<{
    items: T[];
    totalPages: number;
  }>,
  pageSize = CRM_MAX_PAGE_SIZE,
): Promise<T[]> {
  const size = Math.min(CRM_MAX_PAGE_SIZE, Math.max(10, pageSize));
  const first = await fetchPage(1, size);
  const items = [...first.items];
  for (let page = 2; page <= first.totalPages; page++) {
    const next = await fetchPage(page, size);
    items.push(...next.items);
  }
  return items;
}
