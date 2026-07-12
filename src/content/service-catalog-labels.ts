export const SERVICE_CATALOG_CATEGORIES = [
  "site-web",
  "identite",
  "seo",
  "ia",
  "maintenance",
  "devops",
  "autre",
] as const;

export type ServiceCatalogCategory = (typeof SERVICE_CATALOG_CATEGORIES)[number];

export const SERVICE_CATALOG_CATEGORY_LABELS: Record<ServiceCatalogCategory, string> = {
  "site-web": "Site web",
  identite: "Identité visuelle",
  seo: "SEO & marketing",
  ia: "Agents IA",
  maintenance: "Maintenance & support",
  devops: "DevOps & cloud",
  autre: "Autre",
};

export const SERVICE_CATALOG_UNITS = ["forfait", "heure", "page", "mois", "unite"] as const;

export type ServiceCatalogUnit = (typeof SERVICE_CATALOG_UNITS)[number];

export const SERVICE_CATALOG_UNIT_LABELS: Record<ServiceCatalogUnit, string> = {
  forfait: "Forfait",
  heure: "Heure",
  page: "Page",
  mois: "Mois",
  unite: "Unité",
};
