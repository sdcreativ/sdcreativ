import type { Lead, LeadStatus } from "@/lib/leads";
import type { Project } from "@/lib/projects";
import type { Quote } from "@/lib/quotes";
import type { Task } from "@/lib/tasks";
import { LEAD_PIPELINE_COLUMNS } from "@/content/leads-labels";
import { PROJECT_TYPE_LABELS, type ProjectStatus } from "@/content/projects-labels";
import { formatReportAmount } from "@/content/reports-labels";
import { formatTaskDate } from "@/content/tasks-labels";

export type DashboardKpi = {
  id: string;
  label: string;
  value: string;
  href: string;
};

export type DashboardPipelineColumn = {
  id: string;
  title: string;
  count: number;
  cards: Array<{
    id: string;
    title: string;
    subtitle: string;
    meta: string;
    badge?: string;
    href: string;
  }>;
};

export type DashboardActivity = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  href: string;
};

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} j`;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(iso));
}

export function buildDashboardKpis(input: {
  reports: {
    newLeads: number;
    quotesSent: number;
    activeProjects: number;
    deliveredProjects: number;
    revenueQuotes: number;
    revenueProjects: number;
    pipelineForecast: number;
    marginEstimate: number;
    profitabilityRate: number;
    leadConversionRate: number;
  };
  periodLabel: string;
}): DashboardKpi[] {
  const totalRevenue = input.reports.revenueQuotes + input.reports.revenueProjects;

  return [
    {
      id: "leads",
      label: `Leads (${input.periodLabel})`,
      value: String(input.reports.newLeads),
      href: "/admin/crm/leads",
    },
    {
      id: "quotes",
      label: "Devis envoyés",
      value: String(input.reports.quotesSent),
      href: "/admin/crm/devis",
    },
    {
      id: "active",
      label: "Projets en cours",
      value: String(input.reports.activeProjects),
      href: "/admin/crm/projets",
    },
    {
      id: "done",
      label: "Projets terminés",
      value: String(input.reports.deliveredProjects),
      href: "/admin/crm/projets",
    },
    {
      id: "revenue",
      label: "Chiffre d'affaires",
      value: formatReportAmount(totalRevenue),
      href: "/admin/crm/rapports",
    },
    {
      id: "pipeline-forecast",
      label: "Prévisionnel pipeline",
      value: formatReportAmount(input.reports.pipelineForecast),
      href: "/admin/crm/leads",
    },
    {
      id: "margin",
      label: "Marge estimée",
      value: formatReportAmount(input.reports.marginEstimate),
      href: "/admin/crm/rapports",
    },
    {
      id: "profitability",
      label: "Rentabilité",
      value: `${input.reports.profitabilityRate} %`,
      href: "/admin/crm/rapports",
    },
    {
      id: "conversion",
      label: "Conversion leads",
      value: `${input.reports.leadConversionRate} %`,
      href: "/admin/crm/rapports",
    },
  ];
}

export function filterLeadsByDashboard(
  leads: Lead[],
  filters: { assignee?: string; clientId?: string },
): Lead[] {
  let result = leads;
  if (filters.assignee) {
    result = result.filter((l) => l.assignee === filters.assignee);
  }
  return result;
}

export function filterProjectsByDashboard(
  projects: Project[],
  filters: { assignee?: string; clientId?: string },
): Project[] {
  let result = projects;
  if (filters.assignee) {
    result = result.filter((p) => p.assignee === filters.assignee);
  }
  if (filters.clientId) {
    result = result.filter((p) => p.clientId === filters.clientId);
  }
  return result;
}

export function filterTasksByDashboard(
  tasks: Task[],
  filters: { assignee?: string; clientId?: string },
): Task[] {
  let result = tasks;
  if (filters.assignee) {
    result = result.filter((t) => t.assignee === filters.assignee);
  }
  if (filters.clientId) {
    result = result.filter((t) => t.clientId === filters.clientId);
  }
  return result;
}

const LEAD_BADGES: Partial<Record<LeadStatus, string>> = {
  new: "Nouveau",
  signed: "Gagné",
};

export function buildLeadPipeline(leads: Lead[]): DashboardPipelineColumn[] {
  const active = leads.filter((l) => l.status !== "lost");

  return LEAD_PIPELINE_COLUMNS.map(({ status, title }) => {
    const columnLeads = active
      .filter((l) => l.status === status)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 3);

    return {
      id: status,
      title,
      count: active.filter((l) => l.status === status).length,
      cards: columnLeads.map((lead) => ({
        id: lead.id,
        title: lead.company || lead.name,
        subtitle: lead.service || "Projet web",
        meta: formatRelativeTime(lead.createdAt),
        badge: LEAD_BADGES[lead.status],
        href: "/admin/crm/leads",
      })),
    };
  });
}

export function projectDisplayStatus(status: ProjectStatus): "EN COURS" | "EN TEST" | "TERMINÉ" {
  if (status === "delivered") return "TERMINÉ";
  if (status === "testing") return "EN TEST";
  return "EN COURS";
}

export function buildRecentProjects(projects: Project[]) {
  return [...projects]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5)
    .map((project) => ({
      id: project.id,
      name: project.name,
      type: PROJECT_TYPE_LABELS[project.type] ?? project.type,
      status: projectDisplayStatus(project.status),
      progress: project.progress,
      href: "/admin/crm/projets",
    }));
}

export function buildOpenTasks(tasks: Task[]) {
  return tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return a.createdAt.localeCompare(b.createdAt);
    })
    .slice(0, 5)
    .map((task) => ({
      id: task.id,
      label: task.title,
      due: task.dueDate ? formatTaskDate(task.dueDate) : "Sans échéance",
      done: task.status === "done",
    }));
}

export function buildActivities(
  leads: Lead[],
  projects: Project[],
  quotes: Quote[],
  tasks: Task[],
): DashboardActivity[] {
  const items: Array<DashboardActivity & { at: number }> = [];

  for (const project of projects.slice(0, 10)) {
    items.push({
      id: `project-${project.id}`,
      title: project.status === "delivered" ? "Projet livré" : "Projet mis à jour",
      subtitle: project.name,
      time: formatRelativeTime(project.updatedAt),
      href: "/admin/crm/projets",
      at: new Date(project.updatedAt).getTime(),
    });
  }

  for (const quote of quotes.filter((q) => q.status === "accepted").slice(0, 5)) {
    items.push({
      id: `quote-${quote.id}`,
      title: "Devis accepté",
      subtitle: quote.company || quote.name || quote.projectLabel,
      time: formatRelativeTime(quote.updatedAt),
      href: "/admin/crm/devis",
      at: new Date(quote.updatedAt).getTime(),
    });
  }

  for (const lead of leads.filter((l) => l.status === "new" || l.status === "signed").slice(0, 5)) {
    items.push({
      id: `lead-${lead.id}`,
      title: lead.status === "signed" ? "Lead signé" : "Nouveau lead",
      subtitle: lead.company || lead.name,
      time: formatRelativeTime(lead.createdAt),
      href: "/admin/crm/leads",
      at: new Date(lead.createdAt).getTime(),
    });
  }

  for (const task of tasks.filter((t) => t.status === "done").slice(0, 5)) {
    items.push({
      id: `task-${task.id}`,
      title: "Tâche terminée",
      subtitle: task.title,
      time: formatRelativeTime(task.completedAt ?? task.updatedAt),
      href: "/admin/crm/taches",
      at: new Date(task.completedAt ?? task.updatedAt).getTime(),
    });
  }

  return items
    .sort((a, b) => b.at - a.at)
    .slice(0, 6)
    .map(({ at, ...rest }) => {
      void at;
      return rest;
    });
}
