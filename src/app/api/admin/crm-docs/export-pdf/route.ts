import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { listCrmDocPages } from "@/lib/crm-docs";
import { CRM_DOC_FEATURES } from "@/content/crm-docs/catalog";
import {
  buildCrmDocsPackPdfHtml,
  CRM_DOC_PDF_PACKS,
  type CrmDocPdfPackId,
} from "@/lib/crm-docs-pdf";
import { htmlToPdfResponse } from "@/lib/server-pdf";
import type { CrmDocPageRecord } from "@/lib/crm-docs-types";

export async function GET(request: Request) {
  const authError = await crmApiAuth.docs.read();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const pack = searchParams.get("pack") as CrmDocPdfPackId | null;
  if (!pack || !(pack in CRM_DOC_PDF_PACKS)) {
    return NextResponse.json(
      { error: "Pack invalide. Utilisez ?pack=commercial ou ?pack=hr." },
      { status: 400 },
    );
  }

  const meta = CRM_DOC_PDF_PACKS[pack];
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://sdcreativ.com";
  const preferHtml = searchParams.get("format") === "html";

  try {
    let pages: CrmDocPageRecord[] = [];
    if (isDatabaseConfigured()) {
      pages = (await listCrmDocPages({ status: "published" })).filter(
        (p) => !p.deletedAt && p.categorySlug === meta.categorySlug,
      );
    }
    if (pages.length === 0) {
      pages = CRM_DOC_FEATURES.filter((f) => f.category === meta.categorySlug).map((f) => ({
        id: f.id,
        slug: f.id,
        title: f.title,
        categorySlug: f.category,
        summary: f.summary,
        explanation: f.explanation,
        howItWorks: f.howItWorks,
        contentHtml: "",
        href: f.href ?? null,
        screenshots: f.screenshots ?? [],
        videoUrl: null,
        titleEn: "",
        summaryEn: "",
        explanationEn: "",
        howItWorksEn: "",
        contentHtmlEn: "",
        viewCount: 0,
        isRecent: Boolean(f.recent),
        status: "published" as const,
        sortOrder: 0,
        reviewedAt: null,
        deletedAt: null,
        createdAt: "",
        updatedAt: "",
      }));
    }

    const html = buildCrmDocsPackPdfHtml(meta.title, pages, siteUrl);
    return htmlToPdfResponse(html, meta.filename, { preferHtml });
  } catch (error) {
    console.error("[api/admin/crm-docs/export-pdf]", error);
    return NextResponse.json({ error: "Export PDF impossible." }, { status: 500 });
  }
}
