"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CrmLogo } from "@/components/admin/CrmLogo";
import { CrmUserAvatar } from "@/components/admin/CrmUserAvatar";
import { CRM_ROLE_LABELS } from "@/content/crm-roles";
import { crmNavItems } from "@/content/crm-nav";
import { fetchCrmSession, type CrmSessionInfo } from "@/lib/crm-settings-api";
import { filterCrmNavItems } from "@/lib/crm-access";
import { CRM_SESSION_CHANGED_EVENT } from "@/lib/crm-session-events";
import { cn } from "@/lib/utils";

type Props = {
  mobileOpen?: boolean;
  onNavigate?: () => void;
};

function getActiveHref(pathname: string): string | null {
  if (pathname === "/admin/crm" || pathname === "/admin/crm/") return "/admin/crm";

  const match = crmNavItems
    .filter((nav) => nav.href !== "/admin/crm")
    .filter((nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return match?.href ?? null;
}

export function CrmSidebar({ mobileOpen = false, onNavigate }: Props) {
  const pathname = usePathname() ?? "";
  const activeHref = getActiveHref(pathname);
  const [session, setSession] = useState<CrmSessionInfo | null>(null);

  const loadSession = useCallback(() => {
    void fetchCrmSession()
      .then(setSession)
      .catch(() => setSession(null));
  }, []);

  useEffect(() => {
    loadSession();
    window.addEventListener(CRM_SESSION_CHANGED_EVENT, loadSession);
    return () => window.removeEventListener(CRM_SESSION_CHANGED_EVENT, loadSession);
  }, [loadSession]);

  const roleLabel =
    session?.roleLabel ??
    (session ? CRM_ROLE_LABELS[session.role as keyof typeof CRM_ROLE_LABELS] : null);

  const visibleNavItems = session
    ? filterCrmNavItems(crmNavItems, session.permissions)
    : crmNavItems;

  const profileActive = pathname.startsWith("/admin/crm/compte");

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-screen w-[15.5rem] shrink-0 flex-col bg-[#071525] text-white transition-transform duration-200 ease-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
      aria-label="Navigation CRM"
    >
      <div className="border-b border-white/10 px-5 py-5">
        <CrmLogo
          href="/admin/crm"
          size="sidebar"
          priority
          className="inline-block w-full max-w-44"
        />
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
          CRM interne
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {visibleNavItems.map(({ label, href, icon: Icon }) => {
          const active = activeHref === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-white shadow-sm"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        {session ? (
          <Link
            href="/admin/crm/compte"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-3 transition-colors",
              profileActive ? "bg-primary/20 ring-1 ring-primary/40" : "bg-white/5 hover:bg-white/10",
            )}
          >
            <CrmUserAvatar name={session.name} avatarUrl={session.avatarUrl} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{session.name}</p>
              <p className="truncate text-xs text-white/55">{roleLabel ?? session.role}</p>
              <p className="truncate text-[10px] text-white/40">Mon profil</p>
            </div>
          </Link>
        ) : (
          <p className="px-1 text-xs text-white/45">Session…</p>
        )}
      </div>
    </aside>
  );
}
