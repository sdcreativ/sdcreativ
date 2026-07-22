import { buildDocShareHref } from "@/content/crm-docs/context-map";

export const CRM_DOCS_WINDOW_NAME = "sdcreativ-crm-docs";

const DOCS_WINDOW_FEATURES =
  "noopener,noreferrer,width=1280,height=900,menubar=no,toolbar=yes,location=yes,status=yes,resizable=yes,scrollbars=yes";

export function isCrmDocumentationPath(pathname: string): boolean {
  return pathname === "/admin/crm/documentation" || pathname.startsWith("/admin/crm/documentation/");
}

/** Ouvre (ou réutilise) la fenêtre Documentation CRM. */
export function openCrmDocumentationWindow(href?: string | null): Window | null {
  if (typeof window === "undefined") return null;
  const url = href?.trim() || "/admin/crm/documentation";
  const absolute = url.startsWith("http") ? url : new URL(url, window.location.origin).toString();
  const win = window.open(absolute, CRM_DOCS_WINDOW_NAME, DOCS_WINDOW_FEATURES);
  win?.focus();
  return win;
}

export function openCrmDocBySlug(slug: string, query?: string): Window | null {
  return openCrmDocumentationWindow(buildDocShareHref(slug, query));
}
