import type { LucideIcon } from "lucide-react";
import {
  CreditCard,
  FileSignature,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Receipt,
  Settings,
} from "lucide-react";
import type { ClientPortalSection } from "@/content/client-portal-types";

export type ClientNavItem = {
  id: ClientPortalSection;
  label: string;
  icon: LucideIcon;
  badge?: number;
  ready: boolean;
};

export const clientNavItems: ClientNavItem[] = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard, ready: true },
  { id: "project", label: "Mon projet", icon: FolderOpen, ready: true },
  { id: "messages", label: "Messages", icon: MessageSquare, ready: true },
  { id: "files", label: "Fichiers", icon: FileText, ready: true },
  { id: "payments", label: "Paiements", icon: CreditCard, ready: true },
  { id: "quotes", label: "Mes devis", icon: FileSignature, ready: true },
  { id: "invoices", label: "Factures", icon: Receipt, ready: true },
  { id: "support", label: "Support", icon: LifeBuoy, ready: true },
  { id: "settings", label: "Paramètres", icon: Settings, ready: false },
];

export const clientSectionTitles: Record<
  ClientPortalSection,
  { title: string; subtitle?: string }
> = {
  overview: {
    title: "Vue d'ensemble",
    subtitle: "Bienvenue dans votre espace client.",
  },
  project: {
    title: "Mon projet",
    subtitle: "Suivez l'avancement de votre site en temps réel.",
  },
  messages: {
    title: "Messages",
    subtitle: "Échangez avec votre chef de projet.",
  },
  files: { title: "Fichiers", subtitle: "Consultez et déposez vos documents." },
  payments: { title: "Paiements", subtitle: "Historique et échéancier." },
  quotes: { title: "Mes devis", subtitle: "Consultez, téléchargez et signez vos propositions." },
  invoices: { title: "Factures", subtitle: "Consultez et téléchargez vos factures émises." },
  support: { title: "Support" },
  settings: { title: "Paramètres" },
};
