"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCrmBreadcrumbs, withAssistantLabel } from "@/content/crm-nav";
import { useAssistantName } from "@/hooks/useAssistantName";
import { ChevronRight } from "lucide-react";

export function CrmBreadcrumbs() {
  const pathname = usePathname() ?? "/admin/crm";
  const assistantName = useAssistantName();
  const crumbs = getCrmBreadcrumbs(pathname).map((c) => ({ ...c, label: withAssistantLabel(c.label, assistantName) }));

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Fil d'Ariane" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-gray-text">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={`${i}-${crumb.label}`} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 opacity-50" aria-hidden />}
            {isLast ? (
              <span className="font-semibold text-foreground">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="font-medium hover:text-primary hover:underline">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
