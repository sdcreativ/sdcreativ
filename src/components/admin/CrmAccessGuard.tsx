"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { crmNavItems } from "@/content/crm-nav";
import { getCrmRoutePermission } from "@/lib/crm-access";
import { isCrmMessagerieUiEnabled } from "@/lib/mail/config";
import { useCrmPermissions } from "@/hooks/useCrmPermissions";
import { Loader2, ShieldOff } from "lucide-react";

export function CrmAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/admin/crm";
  const { loading, can } = useCrmPermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-text">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        Vérification des accès…
      </div>
    );
  }

  const normalized =
    pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  if (
    normalized.startsWith("/admin/crm/messagerie") &&
    !isCrmMessagerieUiEnabled()
  ) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-gray/40 bg-white p-8 text-center shadow-sm">
        <ShieldOff className="mx-auto h-10 w-10 text-accent" aria-hidden />
        <h2 className="mt-4 text-lg font-bold text-foreground">Messagerie en pause</h2>
        <p className="mt-2 text-sm text-gray-text">
          La messagerie CRM est temporairement désactivée. Elle sera réactivée lorsque les
          boîtes professionnelles individuelles seront disponibles.
        </p>
        <Link
          href="/admin/crm"
          className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  const required = getCrmRoutePermission(pathname, crmNavItems);
  if (required && !can(required)) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-gray/40 bg-white p-8 text-center shadow-sm">
        <ShieldOff className="mx-auto h-10 w-10 text-accent" aria-hidden />
        <h2 className="mt-4 text-lg font-bold text-foreground">Accès refusé</h2>
        <p className="mt-2 text-sm text-gray-text">
          Votre rôle ne vous permet pas d&apos;accéder à cette section du CRM.
        </p>
        <Link
          href="/admin/crm"
          className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  return children;
}
