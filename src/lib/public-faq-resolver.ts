import { faqItems as staticFaqItems, faqItemsEn as staticFaqItemsEn } from "@/content/faq";
import type { FaqItem } from "@/content/faq";
import { isDatabaseConfigured } from "@/lib/db";
import { listPublicFaqItems, toFaqItem } from "@/lib/public-faq-items";
import { allowStaticContentFallback } from "@/lib/static-content-fallback";

function staticFaqForLocale(locale: string): FaqItem[] {
  return locale === "en" ? staticFaqItemsEn : staticFaqItems;
}

export async function getFaqItems(locale = "fr"): Promise<FaqItem[]> {
  if (!isDatabaseConfigured()) {
    return allowStaticContentFallback() ? staticFaqForLocale(locale) : [];
  }

  try {
    const records = await listPublicFaqItems({ locale, visibleOnly: true });
    if (records.length > 0) return records.map(toFaqItem);
  } catch (error) {
    console.error("[public-faq] getFaqItems fallback:", error);
  }

  return allowStaticContentFallback() ? staticFaqForLocale(locale) : [];
}
