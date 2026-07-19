import type { LucideIconName } from "@/lib/lucide-icon-map";
import {
  getFormationDetailSeed,
  type FormationDetailSeed,
} from "@/content/formation-details";
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

export type FormationProcessStepStored = {
  step: number;
  title: string;
  description: string;
};

export type FormationDetailStored = FormationDetailSeed;

export type FormationCategoryStored = {
  id: string;
  icon: LucideIconName;
  title: string;
  description: string;
  image: string;
  imageAlt?: string;
  courses: FormationCourseStored[];
  isServices?: boolean;
  detail: FormationDetailStored;
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

function emptyDetail(title: string): FormationDetailStored {
  return {
    heroDescription: title,
    metaDescription: title,
    format: "Présentiel, distanciel ou intra-entreprise",
    durationSummary: "Sur mesure",
    level: "Tous niveaux",
    audience: [],
    objectives: [],
    prerequisites: [],
    outcomes: [],
    methodology: [],
    process: [],
    faq: [],
  };
}

export const defaultSiteFormationsSettings: SiteFormationsSettings = {
  intro: { ...formationsPageCopy.intro },
  catalog: { ...formationsPageCopy.catalog },
  cta: { ...formationsPageCopy.cta },
  faqHeading: formationsPageCopy.faqHeading,
  highlights: formationsHighlights.map((h) => ({ ...h })),
  categories: formationCategories.map((cat) => ({
    ...cat,
    courses: cat.courses.map((c) => ({ ...c })),
    detail: getFormationDetailSeed(cat.id) ?? emptyDetail(cat.title),
  })),
  faq: formationsFaq.map((f) => ({ ...f })),
};
