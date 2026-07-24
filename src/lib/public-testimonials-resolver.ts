import { testimonials as staticTestimonials } from "@/content/testimonials";
import type { Testimonial } from "@/content/testimonials";
import { allowLocaleStaticSeed } from "@/lib/cms-locale";
import { isDatabaseConfigured } from "@/lib/db";
import { listPublicTestimonials, toTestimonial } from "@/lib/public-testimonials";

export async function getTestimonials(locale = "fr"): Promise<Testimonial[]> {
  if (!isDatabaseConfigured()) {
    return allowLocaleStaticSeed(locale) ? staticTestimonials : [];
  }

  try {
    const records = await listPublicTestimonials({ locale, visibleOnly: true });
    if (records.length > 0) return records.map(toTestimonial);
  } catch (error) {
    console.error("[public-testimonials] getTestimonials fallback:", error);
  }

  return allowLocaleStaticSeed(locale) ? staticTestimonials : [];
}
