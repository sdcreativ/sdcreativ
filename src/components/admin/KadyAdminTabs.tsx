"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, MessageCircleQuestion, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/crm/site/kady", label: "Apparence", icon: Palette },
  { href: "/admin/crm/site/kady/reponses", label: "Réponses", icon: BookOpen },
  { href: "/admin/crm/site/kady/questions", label: "Questions à améliorer", icon: MessageCircleQuestion },
] as const;

/** Onglets des réglages de l'assistante. */
export function KadyAdminTabs() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex flex-wrap gap-1 rounded-xl border border-gray/30 bg-gray-light/30 p-1" aria-label="Réglages de l'assistante">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
              active ? "bg-white text-foreground shadow-sm" : "text-gray-text hover:bg-white/70",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
