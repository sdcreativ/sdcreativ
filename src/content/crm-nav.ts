import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CheckSquare,
  Archive,
  Calendar,
  Clock,
  FileText,
  FolderKanban,
  Globe,
  GitMerge,
  Inbox,
  LayoutDashboard,
  LayoutList,
  LifeBuoy,
  Mail,
  Megaphone,
  Newspaper,
  Phone,
  Receipt,
  Settings,
  Target,
  Tablet,
  UserCog,
  Users,
  UsersRound,
  FileSignature,
} from "lucide-react";

export type CrmNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  ready: boolean;
};

export type CrmNavGroup = {
  id: string;
  label: string;
  items: CrmNavItem[];
};

export const crmNavGroups: CrmNavGroup[] = [
  {
    id: "overview",
    label: "Vue d'ensemble",
    items: [
      { id: "dashboard", label: "Tableau de bord", href: "/admin/crm", icon: LayoutDashboard, ready: true },
      { id: "inbox", label: "Inbox", href: "/admin/crm/inbox", icon: Inbox, ready: true },
      { id: "workload", label: "Charge", href: "/admin/crm/charge", icon: UsersRound, ready: true },
      { id: "reports", label: "Rapports", href: "/admin/crm/rapports", icon: BarChart3, ready: true },
    ],
  },
  {
    id: "commercial",
    label: "Commercial",
    items: [
      { id: "leads", label: "Leads", href: "/admin/crm/leads", icon: Target, ready: true },
      { id: "deals", label: "Opportunités", href: "/admin/crm/opportunites", icon: GitMerge, ready: true },
      { id: "marketing", label: "Marketing", href: "/admin/crm/marketing", icon: Megaphone, ready: true },
      { id: "clients", label: "Clients", href: "/admin/crm/clients", icon: Users, ready: true },
      { id: "quotes", label: "Devis", href: "/admin/crm/devis", icon: FileText, ready: true },
      { id: "catalogue", label: "Catalogue", href: "/admin/crm/catalogue", icon: LayoutList, ready: true },
      { id: "presentation", label: "Présentation tablette", href: "/presentation", icon: Tablet, ready: true },
    ],
  },
  {
    id: "ops",
    label: "Ops",
    items: [
      { id: "projects", label: "Projets", href: "/admin/crm/projets", icon: FolderKanban, ready: true },
      { id: "tasks", label: "Tâches", href: "/admin/crm/taches", icon: CheckSquare, ready: true },
      { id: "tickets", label: "Tickets support", href: "/admin/crm/tickets", icon: LifeBuoy, ready: true },
      {
        id: "communications",
        label: "Communications",
        href: "/admin/crm/communications",
        icon: Phone,
        ready: true,
      },
      { id: "timesheets", label: "Temps", href: "/admin/crm/temps", icon: Clock, ready: true },
      { id: "vendors", label: "Prestataires", href: "/admin/crm/prestataires", icon: UserCog, ready: true },
      { id: "hr", label: "Contrats RH", href: "/admin/crm/rh", icon: FileSignature, ready: true },
      { id: "calendar", label: "Calendrier", href: "/admin/crm/calendrier", icon: Calendar, ready: true },
      { id: "documents", label: "Documents", href: "/admin/crm/documents", icon: FileText, ready: true },
      { id: "archives", label: "Archives", href: "/admin/crm/archives", icon: Archive, ready: true },
      { id: "invoices", label: "Factures", href: "/admin/crm/factures", icon: Receipt, ready: true },
      /** ready: false — UI désactivée tant que CRM_MESSAGERIE_ENABLED ≠ 1. */
      { id: "messagerie", label: "Messagerie", href: "/admin/crm/messagerie", icon: Mail, ready: false },
    ],
  },
  {
    id: "content",
    label: "Contenu",
    items: [
      { id: "blog", label: "Blog", href: "/admin/crm/blog", icon: Newspaper, ready: true },
      { id: "site", label: "Site vitrine", href: "/admin/crm/site", icon: Globe, ready: true },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    items: [
      { id: "settings", label: "Paramètres", href: "/admin/crm/parametres", icon: Settings, ready: true },
    ],
  },
];

/** Liste plate (compat mobile, breadcrumbs, AccessGuard). */
export const crmNavItems: CrmNavItem[] = crmNavGroups.flatMap((g) => g.items);

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

  if (pathname.startsWith("/admin/crm/3cx-pop")) {
    return "Appel 3CX";
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
          formations: "Formations",
          carrieres: "Carrières",
          realisations: "Réalisations",
          maintenance: "Maintenance",
          audit: "Audit",
          legal: "Légal",
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
