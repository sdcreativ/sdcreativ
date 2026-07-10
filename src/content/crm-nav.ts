import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CheckSquare,
  Calendar,
  FileText,
  FolderKanban,
  Globe,
  LayoutDashboard,
  LifeBuoy,
  Newspaper,
  Receipt,
  Settings,
  Target,
  Tablet,
  Users,
} from "lucide-react";

export type CrmNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  ready: boolean;
};

export const crmNavItems: CrmNavItem[] = [
  { id: "dashboard", label: "Tableau de bord", href: "/admin/crm", icon: LayoutDashboard, ready: true },
  { id: "leads", label: "Leads", href: "/admin/crm/leads", icon: Target, ready: true },
  { id: "presentation", label: "Présentation tablette", href: "/presentation", icon: Tablet, ready: true },
  { id: "clients", label: "Clients", href: "/admin/crm/clients", icon: Users, ready: true },
  { id: "projects", label: "Projets", href: "/admin/crm/projets", icon: FolderKanban, ready: true },
  { id: "quotes", label: "Devis", href: "/admin/crm/devis", icon: FileText, ready: true },
  { id: "invoices", label: "Factures", href: "/admin/crm/factures", icon: Receipt, ready: true },
  { id: "documents", label: "Documents", href: "/admin/crm/documents", icon: FileText, ready: true },
  { id: "tasks", label: "Tâches", href: "/admin/crm/taches", icon: CheckSquare, ready: true },
  { id: "tickets", label: "Tickets support", href: "/admin/crm/tickets", icon: LifeBuoy, ready: true },
  { id: "calendar", label: "Calendrier", href: "/admin/crm/calendrier", icon: Calendar, ready: true },
  { id: "blog", label: "Blog", href: "/admin/crm/blog", icon: Newspaper, ready: true },
  { id: "site", label: "Site vitrine", href: "/admin/crm/site", icon: Globe, ready: true },
  { id: "reports", label: "Rapports", href: "/admin/crm/rapports", icon: BarChart3, ready: true },
  { id: "settings", label: "Paramètres", href: "/admin/crm/parametres", icon: Settings, ready: true },
];

function findCrmNavItem(pathname: string): CrmNavItem | undefined {
  return crmNavItems
    .filter((nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function getCrmPageTitle(pathname: string): string {
  if (pathname === "/admin/crm" || pathname === "/admin/crm/") {
    return "Tableau de bord";
  }

  if (pathname.startsWith("/admin/crm/compte")) {
    return "Mon profil";
  }

  const item = findCrmNavItem(pathname);

  return item?.label ?? "CRM";
}

export type CrmBreadcrumb = {
  label: string;
  href: string;
};

export function getCrmBreadcrumbs(pathname: string): CrmBreadcrumb[] {
  const crumbs: CrmBreadcrumb[] = [{ label: "Accueil CRM", href: "/admin/crm" }];

  if (pathname === "/admin/crm" || pathname === "/admin/crm/") {
    return crumbs;
  }

  const item = findCrmNavItem(pathname);

  if (item) {
    crumbs.push({ label: item.label, href: item.href });

    if (pathname.startsWith(`${item.href}/`) && pathname !== item.href) {
      const rest = pathname.slice(item.href.length + 1);
      const segment = rest.split("/")[0];
      if (segment && item.id === "projects") {
        crumbs.push({ label: "Détail projet", href: pathname });
      } else if (segment && item.id === "blog") {
        crumbs.push({
          label: segment === "nouveau" ? "Nouvel article" : "Édition",
          href: pathname,
        });
      } else if (segment && item.id === "site") {
        const siteLabels: Record<string, string> = {
          equipe: "Équipe publique",
          temoignages: "Témoignages",
          faq: "FAQ",
          hero: "Hero accueil",
          heroes: "Heroes des pages",
          accueil: "Pourquoi nous & Méthode",
          services: "Services",
          partenaires: "Partenaires",
          tarifs: "Tarifs",
          devis: "Configurateur de devis",
          "solutions-ia": "Solutions IA",
          carrieres: "Carrières",
          realisations: "Réalisations",
        };
        crumbs.push({
          label: siteLabels[segment] ?? segment,
          href: pathname,
        });
      } else if (segment) {
        crumbs.push({ label: segment, href: pathname });
      }
    }
  }

  return crumbs;
}
