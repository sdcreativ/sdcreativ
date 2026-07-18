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

export async function getFormationsContent(): Promise<ResolvedFormationsContent> {
  const settings = await getSiteFormationsSettings();
  return {
    ...settings,
    categories: settings.categories.map((category) => ({
      ...category,
      icon: getLucideIcon(category.icon),
    })),
    highlights: settings.highlights.map((item) => ({
      ...item,
      icon: getLucideIcon(item.icon),
    })),
  };
}
