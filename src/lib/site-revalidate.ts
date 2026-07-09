import { revalidatePath, revalidateTag } from "next/cache";
import {
  PUBLIC_PRICING_PLANS_TAG,
  PUBLIC_PRICING_REASSURANCE_TAG,
} from "@/lib/public-pricing-resolver";

/** Invalide les pages publiques après modification des coordonnées / réseaux sociaux. */
export function revalidateSitePublicPages() {
  revalidatePath("/", "layout");
  revalidatePath("/contact");
  revalidatePath("/mentions-legales");
  revalidatePath("/politique-confidentialite");
  revalidatePath("/blog/feed.xml");
  revalidatePath("/sitemap.xml");
}

/** Invalide les pages affichant l'équipe publique. */
export function revalidateTeamPages() {
  revalidatePath("/");
  revalidatePath("/a-propos");
  revalidatePath("/en/about");
}

/** Invalide les pages affichant les témoignages. */
export function revalidateTestimonialsPages() {
  revalidatePath("/");
}

/** Invalide les pages affichant la FAQ. */
export function revalidateFaqPages() {
  revalidatePath("/");
  revalidatePath("/faq");
  revalidatePath("/sitemap.xml");
}

export function revalidatePartnersPages() {
  revalidatePath("/");
}

export function revalidateHeroPages() {
  revalidatePath("/");
}

export function revalidateDevisPages() {
  revalidatePath("/devis");
}

export function revalidatePricingPages() {
  revalidateTag(PUBLIC_PRICING_PLANS_TAG, "max");
  revalidateTag(PUBLIC_PRICING_REASSURANCE_TAG, "max");
  revalidatePath("/", "layout");
  revalidatePath("/tarifs", "page");
  revalidatePath("/en/pricing", "page");
  revalidatePath("/sitemap.xml");
}

export function revalidateRealisationsPages(slug?: string) {
  revalidatePath("/realisations");
  if (slug) revalidatePath(`/realisations/${slug}`);
  revalidatePath("/sitemap.xml");
}

export function revalidateWhyUsPages() {
  revalidatePath("/");
}

export function revalidateMethodPages() {
  revalidatePath("/");
  revalidatePath("/a-propos");
}

export function revalidateHomeSectionsPages() {
  revalidateWhyUsPages();
  revalidateMethodPages();
}

export function revalidatePageHeroesPages() {
  revalidatePath("/contact");
  revalidatePath("/tarifs");
  revalidatePath("/devis");
  revalidatePath("/faq");
  revalidatePath("/services");
  revalidatePath("/solutions-ia");
  revalidatePath("/carrieres");
  revalidatePath("/a-propos");
  revalidatePath("/maintenance");
  revalidatePath("/realisations");
  revalidatePath("/blog");
  revalidatePath("/audit-gratuit");
  revalidatePath("/mentions-legales");
  revalidatePath("/politique-confidentialite");
}

export function revalidateSolutionsIaPages() {
  revalidatePath("/solutions-ia");
  revalidatePath("/sitemap.xml");
}

export function revalidateServicesPages(slug?: string) {
  revalidatePath("/");
  revalidatePath("/services");
  if (slug) revalidatePath(`/services/${slug}`);
  revalidatePath("/sitemap.xml");
}

export function revalidateCareersPages() {
  revalidatePath("/carrieres");
  revalidatePath("/sitemap.xml");
}
