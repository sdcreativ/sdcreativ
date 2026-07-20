import type { CrmNavItem } from "@/content/crm-nav";
import type { CrmPermission } from "@/lib/crm-permissions";
import type { DashboardWidgetId } from "@/lib/dashboard-config";
import type { DashboardKpi } from "@/lib/dashboard-utils";
import { isCrmMessagerieUiEnabled } from "@/lib/mail/config";

/** Permissions requises par entrée de navigation (null = accessible à tout utilisateur CRM). */
export const CRM_NAV_PERMISSIONS: Record<string, CrmPermission | CrmPermission[] | null> = {
  dashboard: null,
  leads: "leads.read",
  deals: "deals.read",
  marketing: "marketing.read",
  presentation: "leads.write",
  clients: "clients.read",
  projects: "projects.read",
  quotes: "quotes.read",
  catalogue: "quotes.read",
  invoices: "invoices.read",
  inbox: "tickets.read",
  messagerie: "mail.read",
  communications: "communications.read",
  timesheets: "timesheets.read",
  vendors: "vendors.read",
  documents: "documents.read",
  archives: "projects.read",
  hr: "hr.read",
  tasks: "tasks.read",
  tickets: "tickets.read",
  calendar: "calendar.read",
  blog: "blog.read",
  site: "site.read",
  reports: "reports.view",
  workload: "reports.view",
  settings: ["settings.manage", "users.manage", "audit.view"],
};

export const CRM_NEW_ITEM_PERMISSIONS: Record<string, CrmPermission> = {
  Lead: "leads.write",
  Client: "clients.write",
  Projet: "projects.write",
  Devis: "quotes.write",
  Tâche: "tasks.write",
  Ticket: "tickets.write",
};

export const CRM_KPI_PERMISSIONS: Record<string, CrmPermission> = {
  leads: "leads.read",
  quotes: "quotes.read",
  active: "projects.read",
  done: "projects.read",
  revenue: "reports.view",
  "pipeline-forecast": "leads.read",
  margin: "reports.view",
  profitability: "reports.view",
  conversion: "reports.view",
};

export const CRM_WIDGET_PERMISSIONS: Record<
  DashboardWidgetId,
  CrmPermission | CrmPermission[] | null
> = {
  infra: "infra.view",
  kpis: null,
  communications: ["reports.view", "communications.read"],
  charts: "reports.view",
  pipeline: "leads.read",
  tasks: "tasks.read",
  projects: "projects.read",
  activity: ["leads.read", "projects.read", "quotes.read", "tasks.read"],
};

/** Permissions de lecture utilisées pour la recherche globale. */
export const CRM_SEARCH_READ_PERMISSIONS: CrmPermission[] = [
  "leads.read",
  "clients.read",
  "projects.read",
  "quotes.read",
];

/** Permissions pour accéder aux paramètres CRM (au moins une). */
export const CRM_SETTINGS_ACCESS_PERMISSIONS: CrmPermission[] = [
  "settings.manage",
  "users.manage",
  "audit.view",
];

const ACTIVITY_HREF_PERMISSIONS: Array<{ prefix: string; permission: CrmPermission }> = [
  { prefix: "/admin/crm/leads", permission: "leads.read" },
  { prefix: "/admin/crm/opportunites", permission: "deals.read" },
  { prefix: "/admin/crm/marketing", permission: "marketing.read" },
  { prefix: "/admin/crm/temps", permission: "timesheets.read" },
  { prefix: "/admin/crm/prestataires", permission: "vendors.read" },
  { prefix: "/admin/crm/calendrier", permission: "calendar.read" },
  { prefix: "/admin/crm/projets", permission: "projects.read" },
  { prefix: "/admin/crm/devis", permission: "quotes.read" },
  { prefix: "/admin/crm/catalogue", permission: "quotes.read" },
  { prefix: "/admin/crm/taches", permission: "tasks.read" },
];

export function hasCrmPermission(
  permissions: CrmPermission[],
  required: CrmPermission | CrmPermission[] | null | undefined,
): boolean {
  if (required == null) return true;
  if (Array.isArray(required)) {
    return required.some((perm) => permissions.includes(perm));
  }
  return permissions.includes(required);
}

export function filterCrmNavItems(
  items: CrmNavItem[],
  permissions: CrmPermission[],
): CrmNavItem[] {
  return items.filter((item) => {
    if (item.id === "messagerie" && !isCrmMessagerieUiEnabled()) return false;
    return hasCrmPermission(permissions, CRM_NAV_PERMISSIONS[item.id]);
  });
}

export function filterCrmNavGroups(
  groups: Array<{ id: string; label: string; items: CrmNavItem[] }>,
  permissions: CrmPermission[],
): Array<{ id: string; label: string; items: CrmNavItem[] }> {
  return groups
    .map((group) => ({
      ...group,
      items: filterCrmNavItems(group.items, permissions),
    }))
    .filter((group) => group.items.length > 0);
}

export function filterDashboardKpis(kpis: DashboardKpi[], permissions: CrmPermission[]): DashboardKpi[] {
  return kpis.filter((kpi) => {
    const required = CRM_KPI_PERMISSIONS[kpi.id];
    return !required || permissions.includes(required);
  });
}

export function canShowDashboardWidget(
  widgetId: DashboardWidgetId,
  permissions: CrmPermission[],
  visibleKpiCount = 0,
): boolean {
  const required = CRM_WIDGET_PERMISSIONS[widgetId];
  if (widgetId === "kpis") return visibleKpiCount > 0;
  return hasCrmPermission(permissions, required);
}

export function filterDashboardWidgets(
  widgetIds: DashboardWidgetId[],
  permissions: CrmPermission[],
  visibleKpiCount = 0,
): DashboardWidgetId[] {
  return widgetIds.filter((id) => canShowDashboardWidget(id, permissions, visibleKpiCount));
}

export function filterDashboardActivities<T extends { href: string }>(
  activities: T[],
  permissions: CrmPermission[],
): T[] {
  return activities.filter((activity) => {
    const rule = ACTIVITY_HREF_PERMISSIONS.find((entry) => activity.href.startsWith(entry.prefix));
    if (!rule) return true;
    return permissions.includes(rule.permission);
  });
}

/** Permission(s) requise(s) pour une route CRM (null = toujours accessible si authentifié). */
export function getCrmRoutePermission(
  pathname: string,
  navItems: Array<{ id: string; href: string }>,
): CrmPermission | CrmPermission[] | null {
  const normalized =
    pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

  if (normalized === "/admin/crm" || normalized.startsWith("/admin/compte") || normalized.startsWith("/admin/crm/compte")) {
    return null;
  }

  const match = navItems
    .filter((nav) => nav.href !== "/admin/crm")
    .filter((nav) => normalized === nav.href || normalized.startsWith(`${nav.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (!match) return null;
  return CRM_NAV_PERMISSIONS[match.id] ?? null;
}
