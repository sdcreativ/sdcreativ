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

export function revalidatePricingPages() {
  revalidateTag(PUBLIC_PRICING_PLANS_TAG);
  revalidateTag(PUBLIC_PRICING_REASSURANCE_TAG);
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
