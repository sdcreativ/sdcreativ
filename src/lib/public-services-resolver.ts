import { services as staticServices } from "@/content/services";
import {
  getServiceDetail as getStaticServiceDetail,
  getServiceDetailSlugs as getStaticServiceDetailSlugs,
  hasServiceDetail as staticHasServiceDetail,
  type ServiceDetail,
} from "@/content/service-details";
import { isDatabaseConfigured } from "@/lib/db";
import { getLucideIcon } from "@/lib/lucide-icon-map";
import { listPublicServices } from "@/lib/public-services";
import type {
  ResolvedService,
  ResolvedServiceDetail,
  StoredServiceDetail,
} from "@/lib/public-services-types";
import { allowStaticContentFallback } from "@/lib/static-content-fallback";

function recordToService(record: Awaited<ReturnType<typeof listPublicServices>>[number]): ResolvedService {
  return {
    id: record.slug,
    icon: getLucideIcon(record.icon),
    title: record.title,
    description: record.description,
    features: Array.isArray(record.features) ? record.features : [],
    image: record.image,
    imageAlt: record.imageAlt,
    detailHref: record.detailHref,
    detailLabel: record.detailLabel,
  };
}

/** Complète un détail CRM partiel pour éviter les 500 (tableaux / objets manquants). */
export function normalizeServiceDetail(
  slug: string,
  raw: Partial<StoredServiceDetail> | null | undefined,
  fallback?: ServiceDetail,
): ResolvedServiceDetail | undefined {
  if (!raw && !fallback) return undefined;

  const base = fallback ?? {
    id: slug,
    metaDescription: "",
    heroDescription: "",
    startingFrom: "Sur devis",
    delay: "Selon projet",
    problem: { title: "", text: "" },
    solution: { title: "", text: "" },
    deliverables: [] as string[],
    process: [] as ServiceDetail["process"],
    idealFor: [] as string[],
    faq: [] as ServiceDetail["faq"],
    relatedRealisationIds: [] as string[],
  };

  const detail = raw ?? {};

  return {
    id: slug,
    metaDescription: detail.metaDescription?.trim() || base.metaDescription,
    heroDescription: detail.heroDescription?.trim() || base.heroDescription,
    startingFrom: detail.startingFrom?.trim() || base.startingFrom,
    delay: detail.delay?.trim() || base.delay,
    problem: {
      title: detail.problem?.title?.trim() || base.problem.title,
      text: detail.problem?.text?.trim() || base.problem.text,
    },
    solution: {
      title: detail.solution?.title?.trim() || base.solution.title,
      text: detail.solution?.text?.trim() || base.solution.text,
    },
    deliverables:
      Array.isArray(detail.deliverables) && detail.deliverables.length > 0
        ? detail.deliverables
        : base.deliverables,
    process:
      Array.isArray(detail.process) && detail.process.length > 0
        ? detail.process
        : base.process,
    idealFor:
      Array.isArray(detail.idealFor) && detail.idealFor.length > 0
        ? detail.idealFor
        : base.idealFor,
    faq: Array.isArray(detail.faq) ? detail.faq : base.faq,
    relatedRealisationIds: Array.isArray(detail.relatedRealisationIds)
      ? detail.relatedRealisationIds
      : base.relatedRealisationIds,
  };
}

export async function getServices(): Promise<ResolvedService[]> {
  if (!isDatabaseConfigured()) {
    return allowStaticContentFallback() ? staticServices : [];
  }

  try {
    const records = await listPublicServices({ visibleOnly: true });
    if (records.length > 0) return records.map(recordToService);
  } catch (error) {
    console.error("[public-services] getServices fallback:", error);
  }

  return allowStaticContentFallback() ? staticServices : [];
}

export async function getService(id: string): Promise<ResolvedService | undefined> {
  if (!isDatabaseConfigured()) {
    return allowStaticContentFallback() ? staticServices.find((s) => s.id === id) : undefined;
  }

  try {
    const records = await listPublicServices({ visibleOnly: true });
    const record = records.find((r) => r.slug === id);
    if (record) return recordToService(record);
  } catch (error) {
    console.error("[public-services] getService fallback:", error);
  }

  return allowStaticContentFallback() ? staticServices.find((s) => s.id === id) : undefined;
}

export async function getServiceDetail(slug: string): Promise<ResolvedServiceDetail | undefined> {
  const staticDetail = getStaticServiceDetail(slug);

  if (!isDatabaseConfigured()) {
    return allowStaticContentFallback() ? staticDetail : undefined;
  }

  try {
    const records = await listPublicServices({ visibleOnly: true });
    const record = records.find((r) => r.slug === slug);
    if (record?.detail) {
      return normalizeServiceDetail(slug, record.detail, staticDetail);
    }
    // Service publié sans JSON détail : utiliser le seed pour éviter 404/500 sur /services/[slug].
    if (record && staticDetail) {
      return staticDetail;
    }
  } catch (error) {
    console.error("[public-services] getServiceDetail fallback:", error);
  }

  return allowStaticContentFallback() ? staticDetail : undefined;
}

export async function getServiceDetailSlugs(): Promise<string[]> {
  if (!isDatabaseConfigured()) {
    return allowStaticContentFallback() ? getStaticServiceDetailSlugs() : [];
  }

  try {
    const records = await listPublicServices({ visibleOnly: true });
    // Inclure les services publiés même sans JSON détail (seed / normalize en secours).
    const slugs = records
      .filter((r) => Boolean(r.detail) || staticHasServiceDetail(r.slug))
      .map((r) => r.slug);
    if (slugs.length > 0) return slugs;
  } catch (error) {
    console.error("[public-services] getServiceDetailSlugs fallback:", error);
  }

  return allowStaticContentFallback() ? getStaticServiceDetailSlugs() : [];
}

export async function hasServiceDetail(id: string): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    return allowStaticContentFallback() ? staticHasServiceDetail(id) : false;
  }

  try {
    const records = await listPublicServices({ visibleOnly: true });
    const record = records.find((r) => r.slug === id);
    if (record) return Boolean(record.detail) || staticHasServiceDetail(id);
  } catch (error) {
    console.error("[public-services] hasServiceDetail fallback:", error);
  }

  return allowStaticContentFallback() ? staticHasServiceDetail(id) : false;
}
