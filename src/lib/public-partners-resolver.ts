import { technologyPartners as staticPartners } from "@/content/partners";
import { allowLocaleStaticSeed } from "@/lib/cms-locale";
import { isDatabaseConfigured } from "@/lib/db";
import { listPublicPartners, toTechnologyPartner } from "@/lib/public-partners";
import type { TechnologyPartner } from "@/lib/public-partners";
import { allowStaticContentFallback } from "@/lib/static-content-fallback";

function staticAsPartners(): TechnologyPartner[] {
  return staticPartners.map((p) => ({ name: p.name, category: p.category }));
}

/**
 * Partenaires tech : noms de marques (souvent neutres).
 * Pas de fallback EN→FR en base ; seed statique autorisé hors prod pour FR seulement,
 * et aussi pour EN car les libellés ne sont pas rédigés en français.
 */
export async function getTechnologyPartners(locale = "fr"): Promise<TechnologyPartner[]> {
  if (!isDatabaseConfigured()) {
    if (locale === "en") {
      return allowStaticContentFallback() ? staticAsPartners() : [];
    }
    return allowLocaleStaticSeed(locale) ? staticAsPartners() : [];
  }

  try {
    const records = await listPublicPartners({ locale, visibleOnly: true });
    if (records.length > 0) return records.map(toTechnologyPartner);
  } catch (error) {
    console.error("[public-partners] fallback:", error);
  }

  // Jamais de bascule silencieuse vers locale=fr.
  if (locale === "en") {
    return allowStaticContentFallback() ? staticAsPartners() : [];
  }
  return allowLocaleStaticSeed(locale) ? staticAsPartners() : [];
}
