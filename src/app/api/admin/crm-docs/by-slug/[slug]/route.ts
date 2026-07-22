import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getCrmDocPageBySlug } from "@/lib/crm-docs";
import { CRM_DOC_FEATURES } from "@/content/crm-docs/catalog";
import type { CrmDocPageRecord } from "@/lib/crm-docs-types";
import { crmDocPageExtrasDefaults } from "@/lib/crm-docs-defaults";

type Props = { params: Promise<{ slug: string }> };

function featureAsPage(slug: string): CrmDocPageRecord | null {
  const feature = CRM_DOC_FEATURES.find((f) => f.id === slug);
  if (!feature) return null;
  return {
    id: feature.id,
    slug: feature.id,
    title: feature.title,
    categorySlug: feature.category,
    summary: feature.summary,
    explanation: feature.explanation,
    howItWorks: feature.howItWorks,
    contentHtml: "",
    href: feature.href ?? null,
    screenshots: feature.screenshots ?? [],
    ...crmDocPageExtrasDefaults(),
    isRecent: Boolean(feature.recent),
    status: "published",
    sortOrder: 0,
    reviewedAt: null,
    deletedAt: null,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

export async function GET(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.docs.read();
  if (authError) return authError;

  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw).trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ error: "Slug requis." }, { status: 400 });
  }

  try {
    if (isDatabaseConfigured()) {
      const page = await getCrmDocPageBySlug(slug);
      if (page && !page.deletedAt) {
        if (page.status === "draft") {
          const writeError = await crmApiAuth.docs.write();
          if (writeError) {
            return NextResponse.json({ error: "Fiche introuvable." }, { status: 404 });
          }
        }
        return NextResponse.json({ page });
      }
    }
    const fallback = featureAsPage(slug);
    if (!fallback) {
      return NextResponse.json({ error: "Fiche introuvable." }, { status: 404 });
    }
    return NextResponse.json({ page: fallback });
  } catch (error) {
    console.error("[api/admin/crm-docs/by-slug] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
