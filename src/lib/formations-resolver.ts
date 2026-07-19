import type { LucideIcon } from "lucide-react";
import { getLucideIcon } from "@/lib/lucide-icon-map";
import { getSiteFormationsSettings } from "@/lib/site-formations-settings";
import type {
  FormationCategoryStored,
  FormationHighlightStored,
  SiteFormationsSettings,
} from "@/lib/site-formations-types";

export type ResolvedFormationCategory = Omit<FormationCategoryStored, "icon"> & {
  icon: LucideIcon;
};

export type ResolvedFormationHighlight = Omit<FormationHighlightStored, "icon"> & {
  icon: LucideIcon;
};

export type ResolvedFormationsContent = Omit<
  SiteFormationsSettings,
  "categories" | "highlights"
> & {
  categories: ResolvedFormationCategory[];
  highlights: ResolvedFormationHighlight[];
};

function resolveCategory(category: FormationCategoryStored): ResolvedFormationCategory {
  return {
    ...category,
    icon: getLucideIcon(category.icon),
  };
}

export async function getFormationsContent(): Promise<ResolvedFormationsContent> {
  const settings = await getSiteFormationsSettings();
  return {
    ...settings,
    categories: settings.categories.map(resolveCategory),
    highlights: settings.highlights.map((item) => ({
      ...item,
      icon: getLucideIcon(item.icon),
    })),
  };
}

export async function getFormationCategorySlugs(): Promise<string[]> {
  const settings = await getSiteFormationsSettings();
  return settings.categories.map((cat) => cat.id);
}

export async function getFormationCategory(
  slug: string,
): Promise<ResolvedFormationCategory | null> {
  const settings = await getSiteFormationsSettings();
  const category = settings.categories.find((cat) => cat.id === slug);
  return category ? resolveCategory(category) : null;
}

/** Prix mini parmi les modules tarifés (indicatif). */
export function getFormationPriceFrom(
  category: Pick<FormationCategoryStored, "courses">,
): number | null {
  const prices = category.courses
    .map((c) => c.price)
    .filter((p): p is number => typeof p === "number" && p > 0);
  if (!prices.length) return null;
  return Math.min(...prices);
}
