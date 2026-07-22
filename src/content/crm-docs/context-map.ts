/**
 * Mapping écran CRM (nav id / chemin) → slug de fiche documentation.
 * Utilisé par le lien « Aide » contextuel (?doc=slug).
 */
export const CRM_DOC_SLUG_BY_NAV_ID: Record<string, string> = {
  dashboard: "dashboard",
  inbox: "inbox",
  workload: "workload",
  reports: "reports",
  leads: "leads",
  deals: "deals",
  marketing: "promo-campaigns",
  clients: "clients",
  quotes: "quotes",
  catalogue: "catalogue",
  presentation: "presentation",
  projects: "projects",
  tasks: "tasks",
  tickets: "tickets",
  communications: "communications-3cx",
  timesheets: "timesheets",
  vendors: "vendors",
  hr: "employee-contracts",
  calendar: "calendar",
  documents: "documents",
  archives: "archives",
  invoices: "invoices",
  messagerie: "messagerie",
  blog: "blog",
  site: "site-cms",
  documentation: "dashboard",
  settings: "roles-permissions",
};

/** Préfixes de chemin hors nav id exact (sous-pages). */
const PATH_PREFIX_TO_SLUG: Array<{ prefix: string; slug: string }> = [
  { prefix: "/admin/crm/marketing/campagnes", slug: "promo-campaigns" },
  { prefix: "/admin/crm/marketing", slug: "promo-campaigns" },
  { prefix: "/admin/crm/leads", slug: "leads" },
  { prefix: "/admin/crm/devis", slug: "quotes" },
  { prefix: "/admin/crm/factures", slug: "invoices" },
  { prefix: "/admin/crm/projets", slug: "projects" },
  { prefix: "/admin/crm/taches", slug: "tasks" },
  { prefix: "/admin/crm/tickets", slug: "tickets" },
  { prefix: "/admin/crm/clients", slug: "clients" },
  { prefix: "/admin/crm/opportunites", slug: "deals" },
  { prefix: "/admin/crm/communications", slug: "communications-3cx" },
  { prefix: "/admin/crm/messagerie", slug: "messagerie" },
  { prefix: "/admin/crm/rh", slug: "employee-contracts" },
  { prefix: "/admin/crm/calendrier", slug: "calendar" },
  { prefix: "/admin/crm/documents", slug: "documents" },
  { prefix: "/admin/crm/archives", slug: "archives" },
  { prefix: "/admin/crm/temps", slug: "timesheets" },
  { prefix: "/admin/crm/prestataires", slug: "vendors" },
  { prefix: "/admin/crm/catalogue", slug: "catalogue" },
  { prefix: "/admin/crm/blog", slug: "blog" },
  { prefix: "/admin/crm/site", slug: "site-cms" },
  { prefix: "/admin/crm/parametres", slug: "roles-permissions" },
  { prefix: "/admin/crm/compte", slug: "profile" },
  { prefix: "/admin/crm/inbox", slug: "inbox" },
  { prefix: "/admin/crm/charge", slug: "workload" },
  { prefix: "/admin/crm/rapports", slug: "reports" },
  { prefix: "/presentation", slug: "presentation" },
];

export function resolveCrmDocSlugFromPath(pathname: string): string | null {
  const normalized =
    pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

  if (normalized === "/admin/crm") return "dashboard";

  for (const { prefix, slug } of PATH_PREFIX_TO_SLUG) {
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      return slug;
    }
  }

  return null;
}

export function resolveCrmDocSlugFromNavId(navId: string): string | null {
  return CRM_DOC_SLUG_BY_NAV_ID[navId] ?? null;
}

/** URL d’aide contextuelle → fiche doc (ouverte dans une fenêtre dédiée). */
export function buildContextualHelpHref(pathname: string, docSlug?: string | null): string {
  const slug = docSlug ?? resolveCrmDocSlugFromPath(pathname);
  if (!slug) return "/admin/crm/documentation";
  return buildDocShareHref(slug);
}

/** Lien partageable vers une fiche sur la page documentation. */
export function buildDocShareHref(slug: string, query?: string): string {
  const params = new URLSearchParams();
  if (query?.trim()) params.set("q", query.trim());
  const qs = params.toString();
  return `/admin/crm/documentation${qs ? `?${qs}` : ""}#${encodeURIComponent(slug)}`;
}

export const CRM_DOC_FAVORITES_MAX = 8;
