import type {
  CrmDocCategoryRecord,
  CrmDocPageRecord,
  CrmDocPageStatus,
} from "@/lib/crm-docs-types";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchCrmDocPagesApi(options?: {
  includeDeleted?: boolean;
}): Promise<CrmDocPageRecord[]> {
  const qs = options?.includeDeleted ? "?trash=1" : "";
  const res = await fetch(`/api/admin/crm-docs${qs}`, { credentials: "include" });
  const json = await parseFetchJson<{ pages: CrmDocPageRecord[] }>(res);
  return json.pages ?? [];
}

export async function fetchCrmDocPageApi(id: string): Promise<CrmDocPageRecord> {
  const res = await fetch(`/api/admin/crm-docs/${id}`, { credentials: "include" });
  const json = await parseFetchJson<{ page: CrmDocPageRecord }>(res);
  return json.page;
}

export async function createCrmDocPageApi(
  input: Partial<CrmDocPageRecord> & { title: string; categorySlug: string },
): Promise<CrmDocPageRecord> {
  const res = await fetch("/api/admin/crm-docs", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ page: CrmDocPageRecord }>(res);
  return json.page;
}

export async function updateCrmDocPageApi(
  id: string,
  input: Partial<{
    slug: string;
    title: string;
    categorySlug: string;
    summary: string;
    explanation: string;
    howItWorks: string;
    contentHtml: string;
    href: string | null;
    screenshots: string[];
    isRecent: boolean;
    status: CrmDocPageStatus;
    sortOrder: number;
    markReviewed: boolean;
    reviewedAt: string | null;
    videoUrl: string | null;
    titleEn: string;
    summaryEn: string;
    explanationEn: string;
    howItWorksEn: string;
    contentHtmlEn: string;
  }>,
): Promise<CrmDocPageRecord> {
  const res = await fetch(`/api/admin/crm-docs/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ page: CrmDocPageRecord }>(res);
  return json.page;
}

export async function fetchCrmDocPageBySlugApi(slug: string): Promise<CrmDocPageRecord> {
  const res = await fetch(`/api/admin/crm-docs/by-slug/${encodeURIComponent(slug)}`, {
    credentials: "include",
  });
  const json = await parseFetchJson<{ page: CrmDocPageRecord }>(res);
  return json.page;
}

export async function fetchCrmDocFavoritesApi(): Promise<string[]> {
  const res = await fetch("/api/admin/crm-docs/favorites", { credentials: "include" });
  const json = await parseFetchJson<{ slugs: string[] }>(res);
  return json.slugs ?? [];
}

export async function toggleCrmDocFavoriteApi(
  slug: string,
  action: "add" | "remove",
): Promise<string[]> {
  const res = await fetch("/api/admin/crm-docs/favorites", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, action }),
  });
  const json = await parseFetchJson<{ slugs: string[]; error?: string }>(res);
  if (json.error) throw new Error(json.error);
  return json.slugs ?? [];
}

export async function deleteCrmDocPageApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/crm-docs/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson(res);
}

export async function importStaticCrmDocsApi(): Promise<{
  categories: number;
  pages: number;
  skipped: number;
}> {
  const res = await fetch("/api/admin/crm-docs/import-static", {
    method: "POST",
    credentials: "include",
  });
  return parseFetchJson(res);
}

/** Crée la fiche en base si absente (catalogue → DB), puis renvoie la page éditable. */
export async function ensureCrmDocPageApi(slug: string): Promise<CrmDocPageRecord> {
  const res = await fetch("/api/admin/crm-docs/ensure", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });
  const json = await parseFetchJson<{ page: CrmDocPageRecord }>(res);
  return json.page;
}

export async function fetchCrmDocCategoriesApi(): Promise<CrmDocCategoryRecord[]> {
  const res = await fetch("/api/admin/crm-doc-categories", { credentials: "include" });
  const json = await parseFetchJson<{ categories: CrmDocCategoryRecord[] }>(res);
  return json.categories ?? [];
}

export async function createCrmDocCategoryApi(input: {
  label: string;
  description?: string;
  slug?: string;
}): Promise<CrmDocCategoryRecord> {
  const res = await fetch("/api/admin/crm-doc-categories", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ category: CrmDocCategoryRecord }>(res);
  return json.category;
}

export async function updateCrmDocCategoryApi(
  id: string,
  input: Partial<{ label: string; description: string; slug: string; sortOrder: number }>,
): Promise<CrmDocCategoryRecord> {
  const res = await fetch(`/api/admin/crm-doc-categories/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ category: CrmDocCategoryRecord }>(res);
  return json.category;
}

export async function deleteCrmDocCategoryApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/crm-doc-categories/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson(res);
}

export async function uploadCrmDocImageApi(file: File): Promise<{ url: string; storage: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/crm-docs/upload", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  return parseFetchJson(res);
}

export type CrmDocRevisionItem = {
  id: string;
  pageId: string;
  snapshot: { title: string; status: string };
  createdByName: string | null;
  createdByEmail: string | null;
  createdAt: string;
};

export async function fetchCrmDocRevisionsApi(pageId: string): Promise<CrmDocRevisionItem[]> {
  const res = await fetch(`/api/admin/crm-docs/${pageId}/revisions`, {
    credentials: "include",
  });
  const json = await parseFetchJson<{ revisions: CrmDocRevisionItem[] }>(res);
  return json.revisions ?? [];
}

export async function restoreCrmDocRevisionApi(
  pageId: string,
  revisionId: string,
): Promise<CrmDocPageRecord> {
  const res = await fetch(`/api/admin/crm-docs/${pageId}/revisions/${revisionId}/restore`, {
    method: "POST",
    credentials: "include",
  });
  const json = await parseFetchJson<{ page: CrmDocPageRecord }>(res);
  return json.page;
}

export async function publishCrmWikiApi(generateOnly = false): Promise<{
  ok: boolean;
  pushed: boolean;
  pages: number;
  categories: number;
  source: string;
  hint?: string;
  commitMessage?: string;
}> {
  const qs = generateOnly ? "?generateOnly=1" : "";
  const res = await fetch(`/api/admin/crm-docs/publish-wiki${qs}`, {
    method: "POST",
    credentials: "include",
  });
  return parseFetchJson(res);
}

export async function submitCrmDocFeedbackApi(input: {
  slug: string;
  kind: "helpful" | "error";
  message?: string;
}): Promise<void> {
  const res = await fetch("/api/admin/crm-docs/feedback", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await parseFetchJson(res);
}

export async function trackCrmDocViewApi(slug: string): Promise<number> {
  const res = await fetch("/api/admin/crm-docs/views", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });
  const json = await parseFetchJson<{ viewCount: number }>(res);
  return json.viewCount ?? 0;
}

export async function fetchCrmDocTopViewsApi(limit = 8): Promise<
  Array<{ slug: string; title: string; viewCount: number }>
> {
  const res = await fetch(`/api/admin/crm-docs/views?limit=${limit}`, {
    credentials: "include",
  });
  const json = await parseFetchJson<{
    top: Array<{ slug: string; title: string; viewCount: number }>;
  }>(res);
  return json.top ?? [];
}

export async function fetchCrmDocOnboardingApi(): Promise<{
  steps: typeof import("@/content/crm-docs/onboarding-week").CRM_DOC_ONBOARDING_WEEK;
  completed: string[];
}> {
  const res = await fetch("/api/admin/crm-docs/onboarding", { credentials: "include" });
  return parseFetchJson(res);
}

export async function setCrmDocOnboardingStepApi(
  stepId: string,
  completed: boolean,
): Promise<string[]> {
  const res = await fetch("/api/admin/crm-docs/onboarding", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stepId, completed }),
  });
  const json = await parseFetchJson<{ completed: string[] }>(res);
  return json.completed ?? [];
}
