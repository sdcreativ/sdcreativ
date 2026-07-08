import { faqItems as staticFaqItems } from "@/content/faq";
import type { FaqItem } from "@/content/faq";
import { isDatabaseConfigured } from "@/lib/db";
import { listPublicFaqItems, toFaqItem } from "@/lib/public-faq-items";

export async function getFaqItems(locale = "fr"): Promise<FaqItem[]> {
  if (!isDatabaseConfigured()) return staticFaqItems;

  try {
    const records = await listPublicFaqItems({ locale, visibleOnly: true });
    if (records.length > 0) return records.map(toFaqItem);
  } catch (error) {
    console.error("[public-faq] getFaqItems fallback:", error);
  }

  return staticFaqItems;
}
