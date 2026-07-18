import type { LucideIconName } from "@/lib/lucide-icon-map";
import {
  formationCategories,
  formationsFaq,
  formationsHighlights,
  formationsPageCopy,
} from "@/content/formations";

export type FormationCourseStored = {
  title: string;
  duration?: string;
  price?: number | null;
};

export type FormationCategoryStored = {
  id: string;
  icon: LucideIconName;
  title: string;
  description: string;
  courses: FormationCourseStored[];
  isServices?: boolean;
};

export type FormationHighlightStored = {
  icon: LucideIconName;
  title: string;
  description: string;
};

export type FormationFaqStored = {
  question: string;
  answer: string;
};

export type SectionHeadingStored = {
  eyebrow: string;
  title: string;
  highlight: string;
  description?: string;
};

export type SiteFormationsSettings = {
  intro: SectionHeadingStored;
  catalog: SectionHeadingStored;
  cta: {
    title: string;
    description: string;
    primary: string;
    secondary: string;
  };
  faqHeading: string;
  highlights: FormationHighlightStored[];
  categories: FormationCategoryStored[];
  faq: FormationFaqStored[];
};

export const defaultSiteFormationsSettings: SiteFormationsSettings = {
  intro: { ...formationsPageCopy.intro },
  catalog: { ...formationsPageCopy.catalog },
  cta: { ...formationsPageCopy.cta },
  faqHeading: formationsPageCopy.faqHeading,
  highlights: formationsHighlights.map((h) => ({ ...h })),
  categories: formationCategories.map((cat) => ({
    ...cat,
    courses: cat.courses.map((c) => ({ ...c })),
  })),
  faq: formationsFaq.map((f) => ({ ...f })),
};
