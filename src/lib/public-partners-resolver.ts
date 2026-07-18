import { technologyPartners as staticPartners } from "@/content/partners";
import { isDatabaseConfigured } from "@/lib/db";
import { listPublicPartners, toTechnologyPartner } from "@/lib/public-partners";
import type { TechnologyPartner } from "@/lib/public-partners";
import { allowStaticContentFallback } from "@/lib/static-content-fallback";

function staticAsPartners(): TechnologyPartner[] {
  return staticPartners.map((p) => ({ name: p.name, category: p.category }));
}

export async function getTechnologyPartners(locale = "fr"): Promise<TechnologyPartner[]> {
  if (!isDatabaseConfigured()) {
    return allowStaticContentFallback() ? staticAsPartners() : [];
  }

  try {
    const records = await listPublicPartners({ locale, visibleOnly: true });
    if (records.length > 0) return records.map(toTechnologyPartner);
  } catch (error) {
    console.error("[public-partners] fallback:", error);
  }

  return allowStaticContentFallback() ? staticAsPartners() : [];
}
