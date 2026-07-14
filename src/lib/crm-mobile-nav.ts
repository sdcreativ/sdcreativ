import { crmNavItems, type CrmNavItem } from "@/content/crm-nav";
import { isSystemCrmRole, type SystemCrmRole } from "@/content/crm-roles";
import { filterCrmNavItems } from "@/lib/crm-access";
import type { CrmPermission } from "@/lib/crm-permissions";

/** Modules réservés au desktop — masqués de toute navigation mobile. */
export const CRM_MOBILE_DESKTOP_ONLY_IDS = new Set([
  "marketing",
  "presentation",
  "catalogue",
  "timesheets",
  "vendors",
  "documents",
  "blog",
  "site",
  "reports",
]);

/** Ordre des entrées dans le menu « Plus » mobile. */
export const CRM_MOBILE_SECONDARY_IDS = [
  "quotes",
  "invoices",
  "projects",
  "tickets",
  "deals",
  "inbox",
  "settings",
] as const;

/** Barre du bas : 5 entrées max selon le rôle système. */
export const ROLE_MOBILE_PRIMARY_IDS: Record<SystemCrmRole, string[]> = {
  admin: ["dashboard", "leads", "clients", "calendar", "tasks"],
  sales_director: ["dashboard", "leads", "clients", "calendar", "quotes"],
  commercial: ["dashboard", "leads", "clients", "calendar", "tasks"],
  project_manager: ["dashboard", "tasks", "projects", "calendar", "tickets"],
  readonly: ["dashboard", "clients", "calendar", "quotes", "invoices"],
};

const PRIMARY_FALLBACK_IDS = [
  "dashboard",
  "leads",
  "clients",
  "calendar",
  "tasks",
  "quotes",
  "projects",
  "tickets",
  "invoices",
  "deals",
  "inbox",
  "settings",
];

export const CRM_MOBILE_SHORT_LABELS: Partial<Record<string, string>> = {
  dashboard: "Accueil",
  leads: "Leads",
  clients: "Clients",
  calendar: "Calendrier",
  tasks: "Tâches",
  quotes: "Devis",
  invoices: "Factures",
  projects: "Projets",
  tickets: "Tickets",
  deals: "Opport.",
  inbox: "Inbox",
  settings: "Param.",
};

export type MobileNavSplit = {
  primary: CrmNavItem[];
  secondary: CrmNavItem[];
};

export function resolveMobileNav(permissions: CrmPermission[], role: string): MobileNavSplit {
  const visible = filterCrmNavItems(
    crmNavItems.filter((item) => !CRM_MOBILE_DESKTOP_ONLY_IDS.has(item.id)),
    permissions,
  );
  const byId = new Map(visible.map((item) => [item.id, item]));

  const roleKey: SystemCrmRole = isSystemCrmRole(role) ? role : "commercial";
  const preferredPrimary = ROLE_MOBILE_PRIMARY_IDS[roleKey];

  const primary: CrmNavItem[] = [];
  const usedIds = new Set<string>();

  for (const id of preferredPrimary) {
    if (primary.length >= 5) break;
    const item = byId.get(id);
    if (item) {
      primary.push(item);
      usedIds.add(id);
    }
  }

  if (primary.length < 5) {
    for (const id of PRIMARY_FALLBACK_IDS) {
      if (primary.length >= 5) break;
      if (usedIds.has(id)) continue;
      const item = byId.get(id);
      if (item) {
        primary.push(item);
        usedIds.add(id);
      }
    }
  }

  const secondary: CrmNavItem[] = [];
  for (const id of CRM_MOBILE_SECONDARY_IDS) {
    if (usedIds.has(id)) continue;
    const item = byId.get(id);
    if (item) secondary.push(item);
  }

  for (const item of visible) {
    if (usedIds.has(item.id)) continue;
    if (secondary.some((entry) => entry.id === item.id)) continue;
    secondary.push(item);
  }

  return { primary, secondary };
}

export function getMobileNavLabel(item: CrmNavItem): string {
  return CRM_MOBILE_SHORT_LABELS[item.id] ?? item.label;
}

export function isMobileNavActive(pathname: string, href: string): boolean {
  if (href === "/admin/crm") {
    return pathname === "/admin/crm" || pathname === "/admin/crm/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isMobilePlusActive(pathname: string, secondary: CrmNavItem[]): boolean {
  return secondary.some((item) => isMobileNavActive(pathname, item.href));
}
