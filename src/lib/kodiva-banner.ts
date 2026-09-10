import { normalizePath } from "@/i18n/routes";

export const KODIVA_REGISTER_URL = "https://kodiva.sdcreativ.com/register";

/** sessionStorage : masque le bandeau jusqu’à la fermeture de l’onglet. */
export const KODIVA_BANNER_STORAGE_KEY = "sd-kodiva-banner";

/** Déjà un CTA KODIVA sous Kady : pas de bandeau en double. */
export function isKodivaBannerHiddenPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return (
    path === "/solutions-ia" ||
    path === "/en/solutions-ia" ||
    path === "/produits" ||
    path === "/en/products"
  );
}
