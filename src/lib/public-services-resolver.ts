import { services as staticServices } from "@/content/services";
import {
  getServiceDetail as getStaticServiceDetail,
  getServiceDetailSlugs as getStaticServiceDetailSlugs,
  hasServiceDetail as staticHasServiceDetail,
} from "@/content/service-details";
import { isDatabaseConfigured } from "@/lib/db";
import { getLucideIcon } from "@/lib/lucide-icon-map";
import { listPublicServices } from "@/lib/public-services";
import type { ResolvedService, ResolvedServiceDetail } from "@/lib/public-services-types";
import { allowStaticContentFallback } from "@/lib/static-content-fallback";

function recordToService(record: Awaited<ReturnType<typeof listPublicServices>>[number]): ResolvedService {
  return {
    id: record.slug,
    icon: getLucideIcon(record.icon),
    title: record.title,
    description: record.description,
    features: record.features,
    image: record.image,
    imageAlt: record.imageAlt,
    detailHref: record.detailHref,
    detailLabel: record.detailLabel,
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
  if (!isDatabaseConfigured()) {
    return allowStaticContentFallback() ? getStaticServiceDetail(slug) : undefined;
  }

  try {
    const records = await listPublicServices({ visibleOnly: true });
    const record = records.find((r) => r.slug === slug);
    if (record?.detail) {
      return { id: slug, ...record.detail };
    }
  } catch (error) {
    console.error("[public-services] getServiceDetail fallback:", error);
  }

  return allowStaticContentFallback() ? getStaticServiceDetail(slug) : undefined;
}

export async function getServiceDetailSlugs(): Promise<string[]> {
  if (!isDatabaseConfigured()) {
    return allowStaticContentFallback() ? getStaticServiceDetailSlugs() : [];
  }

  try {
    const records = await listPublicServices({ visibleOnly: true });
    const slugs = records.filter((r) => r.detail).map((r) => r.slug);
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
    if (record) return Boolean(record.detail);
  } catch (error) {
    console.error("[public-services] hasServiceDetail fallback:", error);
  }

  return allowStaticContentFallback() ? staticHasServiceDetail(id) : false;
}
