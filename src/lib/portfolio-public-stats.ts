import type { Realisation } from "@/content/realisations";

export type PortfolioPublicStat = {
  value: string;
  label: string;
};

/** Stats affichables dérivées uniquement des réalisations publiées. */
export function buildPortfolioPublicStats(
  items: Realisation[],
  locale: "fr" | "en" = "fr",
): PortfolioPublicStat[] {
  if (items.length === 0) return [];

  const sectors = new Set(
    items.map((item) => item.sector?.trim()).filter((s): s is string => Boolean(s)),
  );
  const categories = new Set(
    items.map((item) => item.category?.trim()).filter((s): s is string => Boolean(s)),
  );
  const sectorCount = sectors.size > 0 ? sectors.size : categories.size;
  const isEn = locale === "en";

  const stats: PortfolioPublicStat[] = [
    {
      value: String(items.length),
      label: isEn
        ? items.length > 1
          ? "Published projects"
          : "Published project"
        : items.length > 1
          ? "Projets publiés"
          : "Projet publié",
    },
  ];

  if (sectorCount > 0) {
    stats.push({
      value: String(sectorCount),
      label: isEn
        ? sectorCount > 1
          ? "Sectors covered"
          : "Sector covered"
        : sectorCount > 1
          ? "Secteurs couverts"
          : "Secteur couvert",
    });
  }

  return stats;
}

export function uniqueSectorsFromRealisations(items: Realisation[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const sector = item.sector?.trim();
    if (!sector || seen.has(sector)) continue;
    seen.add(sector);
    out.push(sector);
  }
  return out;
}
