import type { LucideIcon } from "lucide-react";
import { getLucideIcon } from "@/lib/lucide-icon-map";
import { getSiteSolutionsIaSettings } from "@/lib/site-solutions-ia-settings";
import type {
  IaDemoHighlightStored,
  IaUseCaseStored,
  SiteSolutionsIaSettings,
} from "@/lib/site-solutions-ia-types";

export type ResolvedIaUseCase = Omit<IaUseCaseStored, "icon"> & { icon: LucideIcon };
export type ResolvedIaDemoHighlight = Omit<IaDemoHighlightStored, "icon"> & { icon: LucideIcon };

export type ResolvedSolutionsIaContent = Omit<
  SiteSolutionsIaSettings,
  "useCases" | "demoHighlights"
> & {
  useCases: ResolvedIaUseCase[];
  demoHighlights: ResolvedIaDemoHighlight[];
};

export async function getSolutionsIaContent(): Promise<ResolvedSolutionsIaContent> {
  const settings = await getSiteSolutionsIaSettings();
  return {
    ...settings,
    useCases: settings.useCases.map((useCase) => ({
      ...useCase,
      icon: getLucideIcon(useCase.icon),
    })),
    demoHighlights: settings.demoHighlights.map((item) => ({
      ...item,
      icon: getLucideIcon(item.icon),
    })),
  };
}
