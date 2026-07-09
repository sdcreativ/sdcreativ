"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Briefcase,
  Calculator,
  Handshake,
  Heart,
  HelpCircle,
  Layers,
  LayoutTemplate,
  MessageSquareQuote,
  Receipt,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/crm/site/equipe", label: "Équipe", icon: Users },
  { href: "/admin/crm/site/temoignages", label: "Témoignages", icon: MessageSquareQuote },
  { href: "/admin/crm/site/faq", label: "FAQ", icon: HelpCircle },
  { href: "/admin/crm/site/hero", label: "Hero", icon: LayoutTemplate },
  { href: "/admin/crm/site/heroes", label: "Pages", icon: LayoutTemplate },
  { href: "/admin/crm/site/accueil", label: "Accueil", icon: Heart },
  { href: "/admin/crm/site/services", label: "Services", icon: Wrench },
  { href: "/admin/crm/site/partenaires", label: "Partenaires", icon: Handshake },
  { href: "/admin/crm/site/tarifs", label: "Tarifs", icon: Receipt },
  { href: "/admin/crm/site/devis", label: "Configurateur", icon: Calculator },
  { href: "/admin/crm/site/solutions-ia", label: "Solutions IA", icon: Bot },
  { href: "/admin/crm/site/carrieres", label: "Carrières", icon: Briefcase },
  { href: "/admin/crm/site/realisations", label: "Réalisations", icon: Layers },
] as const;

export function CrmSiteSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-6 flex flex-wrap gap-2 border-b border-gray/40 pb-4"
      aria-label="Sections du site vitrine"
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-white"
                : "bg-gray-light text-gray-text hover:bg-gray/20 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
