import { revalidatePath } from "next/cache";

/** Invalide les pages publiques après modification des coordonnées / réseaux sociaux. */
export function revalidateSitePublicPages() {
  revalidatePath("/", "layout");
  revalidatePath("/contact");
  revalidatePath("/mentions-legales");
  revalidatePath("/politique-confidentialite");
  revalidatePath("/blog/feed.xml");
  revalidatePath("/sitemap.xml");
}
