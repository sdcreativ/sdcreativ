import { z } from "zod";

export const CRM_DOC_PAGE_STATUSES = ["draft", "published"] as const;
export type CrmDocPageStatus = (typeof CRM_DOC_PAGE_STATUSES)[number];

export type CrmDocLocale = "fr" | "en";

export type CrmDocCategoryRecord = {
  id: string;
  slug: string;
  label: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CrmDocPageRecord = {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
  summary: string;
  explanation: string;
  howItWorks: string;
  contentHtml: string;
  href: string | null;
  screenshots: string[];
  videoUrl: string | null;
  titleEn: string;
  summaryEn: string;
  explanationEn: string;
  howItWorksEn: string;
  contentHtmlEn: string;
  isRecent: boolean;
  status: CrmDocPageStatus;
  sortOrder: number;
  viewCount: number;
  reviewedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function slugifyDocTitle(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Contenu localisé avec repli FR. */
export function localizeCrmDocPage(
  page: Pick<
    CrmDocPageRecord,
    | "title"
    | "summary"
    | "explanation"
    | "howItWorks"
    | "contentHtml"
    | "titleEn"
    | "summaryEn"
    | "explanationEn"
    | "howItWorksEn"
    | "contentHtmlEn"
  >,
  locale: CrmDocLocale,
) {
  if (locale !== "en") {
    return {
      title: page.title,
      summary: page.summary,
      explanation: page.explanation,
      howItWorks: page.howItWorks,
      contentHtml: page.contentHtml,
    };
  }
  return {
    title: page.titleEn.trim() || page.title,
    summary: page.summaryEn.trim() || page.summary,
    explanation: page.explanationEn.trim() || page.explanation,
    howItWorks: page.howItWorksEn.trim() || page.howItWorks,
    contentHtml: page.contentHtmlEn.trim() || page.contentHtml,
  };
}

export const createCrmDocCategorySchema = z.object({
  slug: z.string().trim().min(2).max(80).optional(),
  label: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().default(""),
  sortOrder: z.number().int().optional(),
});

export const updateCrmDocCategorySchema = createCrmDocCategorySchema.partial();

export const createCrmDocPageSchema = z.object({
  slug: z.string().trim().min(2).max(80).optional(),
  title: z.string().trim().min(2).max(200),
  categorySlug: z.string().trim().min(2).max(80),
  summary: z.string().trim().max(500).optional().default(""),
  explanation: z.string().trim().max(20_000).optional().default(""),
  howItWorks: z.string().trim().max(20_000).optional().default(""),
  contentHtml: z.string().max(200_000).optional().default(""),
  href: z.string().trim().max(500).optional().nullable(),
  screenshots: z.array(z.string().trim().min(1).max(500)).max(20).optional().default([]),
  videoUrl: z.string().trim().max(500).optional().nullable(),
  titleEn: z.string().trim().max(200).optional().default(""),
  summaryEn: z.string().trim().max(500).optional().default(""),
  explanationEn: z.string().trim().max(20_000).optional().default(""),
  howItWorksEn: z.string().trim().max(20_000).optional().default(""),
  contentHtmlEn: z.string().max(200_000).optional().default(""),
  isRecent: z.boolean().optional().default(false),
  status: z.enum(CRM_DOC_PAGE_STATUSES).optional().default("published"),
  sortOrder: z.number().int().optional().default(0),
  /** true = NOW(), false/null = clear, ISO string = set */
  markReviewed: z.boolean().optional(),
  reviewedAt: z.string().datetime().nullable().optional(),
});

export const updateCrmDocPageSchema = createCrmDocPageSchema.partial();
