import type { CrmRole, SystemCrmRole } from "@/content/crm-roles";

export const DASHBOARD_WIDGETS = [
  "infra",
  "kpis",
  "communications",
  "charts",
  "pipeline",
  "tasks",
  "projects",
  "activity",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGETS)[number];

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  infra: "Santé infra VPS",
  kpis: "Indicateurs clés",
  communications: "Communications 3CX",
  charts: "Graphiques",
  pipeline: "Pipeline commercial",
  tasks: "Tâches à faire",
  projects: "Projets récents",
  activity: "Activité récente",
};

/** Widgets visibles par défaut selon le rôle système. */
export const ROLE_DASHBOARD_WIDGETS: Record<SystemCrmRole, DashboardWidgetId[]> = {
  admin: ["infra", "kpis", "communications", "charts", "pipeline", "tasks", "projects", "activity"],
  sales_director: ["kpis", "communications", "charts", "pipeline", "tasks", "projects", "activity"],
  commercial: ["kpis", "communications", "pipeline", "charts", "activity"],
  project_manager: ["kpis", "tasks", "projects", "charts"],
  readonly: ["kpis", "communications", "charts", "pipeline", "projects", "activity"],
};

export type DashboardLayout = {
  order: DashboardWidgetId[];
  hidden: DashboardWidgetId[];
};

const STORAGE_KEY = "crm-dashboard-layout-v1";

export function getDefaultDashboardLayout(role: CrmRole): DashboardLayout {
  const order =
    ROLE_DASHBOARD_WIDGETS[role as SystemCrmRole] ?? ROLE_DASHBOARD_WIDGETS.commercial;
  const visible = new Set(order);
  return {
    order: [...DASHBOARD_WIDGETS].filter((id) => visible.has(id)),
    hidden: [...DASHBOARD_WIDGETS].filter((id) => !visible.has(id)),
  };
}

export function loadDashboardLayout(role: CrmRole): DashboardLayout {
  if (typeof window === "undefined") return getDefaultDashboardLayout(role);

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultDashboardLayout(role);
    const parsed = JSON.parse(raw) as DashboardLayout;
    const validOrder = parsed.order?.filter((id) =>
      (DASHBOARD_WIDGETS as readonly string[]).includes(id),
    ) as DashboardWidgetId[];
    const validHidden = parsed.hidden?.filter((id) =>
      (DASHBOARD_WIDGETS as readonly string[]).includes(id),
    ) as DashboardWidgetId[];
    if (validOrder.length === 0) return getDefaultDashboardLayout(role);
    return mergeDashboardLayout({ order: validOrder, hidden: validHidden ?? [] }, role);
  } catch {
    return getDefaultDashboardLayout(role);
  }
}

function mergeDashboardLayout(layout: DashboardLayout, role: CrmRole): DashboardLayout {
  const defaults = getDefaultDashboardLayout(role);
  const known = new Set([...layout.order, ...layout.hidden]);
  const missing = DASHBOARD_WIDGETS.filter((id) => !known.has(id));
  if (missing.length === 0) return layout;

  const defaultOrder = new Set(defaults.order);
  const order = [...layout.order];
  const hidden = [...layout.hidden];

  for (const id of missing) {
    if (defaultOrder.has(id)) order.unshift(id);
    else hidden.push(id);
  }

  return { order, hidden };
}

export function saveDashboardLayout(layout: DashboardLayout): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

export function moveWidget(
  layout: DashboardLayout,
  id: DashboardWidgetId,
  direction: "up" | "down",
): DashboardLayout {
  const order = [...layout.order];
  const idx = order.indexOf(id);
  if (idx === -1) return layout;
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= order.length) return layout;
  [order[idx], order[swap]] = [order[swap]!, order[idx]!];
  return { ...layout, order };
}

export function toggleWidgetVisibility(
  layout: DashboardLayout,
  id: DashboardWidgetId,
): DashboardLayout {
  if (layout.hidden.includes(id)) {
    return {
      order: [...layout.order, id],
      hidden: layout.hidden.filter((w) => w !== id),
    };
  }
  return {
    order: layout.order.filter((w) => w !== id),
    hidden: [...layout.hidden, id],
  };
}
