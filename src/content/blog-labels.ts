export const BLOG_POST_STATUSES = ["draft", "scheduled", "published"] as const;
export type BlogPostStatus = (typeof BLOG_POST_STATUSES)[number];

export const BLOG_POST_STATUS_LABELS: Record<BlogPostStatus, string> = {
  draft: "Brouillon",
  scheduled: "Planifié",
  published: "Publié",
};

export const BLOG_CATEGORIES = [
  "Stratégie digitale",
  "SEO",
  "Refonte web",
  "Conseils",
  "E-commerce",
  "Intelligence artificielle",
  "Automatisation",
  "DevOps",
] as const;
