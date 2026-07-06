"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CrmLogo } from "@/components/admin/CrmLogo";
import { CRM_ROLE_LABELS } from "@/content/crm-roles";
import { crmNavItems } from "@/content/crm-nav";
import { fetchCrmSession, type CrmSessionInfo } from "@/lib/crm-settings-api";
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

function userInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function CrmSidebar({ mobileOpen = false, onNavigate }: Props) {
  const pathname = usePathname() ?? "";
  const activeHref = getActiveHref(pathname);
  const [session, setSession] = useState<CrmSessionInfo | null>(null);

  useEffect(() => {
    void fetchCrmSession()
      .then(setSession)
      .catch(() => setSession(null));
  }, []);

  const roleLabel =
    session?.roleLabel ??
    (session ? CRM_ROLE_LABELS[session.role as keyof typeof CRM_ROLE_LABELS] : null);

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
        {crmNavItems.map(({ label, href, icon: Icon }) => {
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
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold">
              {userInitials(session.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{session.name}</p>
              <p className="truncate text-xs text-white/55">{roleLabel ?? session.role}</p>
            </div>
          </div>
        ) : (
          <p className="px-1 text-xs text-white/45">Session…</p>
        )}
      </div>
    </aside>
  );
}
