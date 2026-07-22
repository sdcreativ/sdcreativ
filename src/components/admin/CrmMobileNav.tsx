"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CrmUserAvatar } from "@/components/admin/CrmUserAvatar";
import { CRM_ROLE_LABELS } from "@/content/crm-roles";
import { fetchCrmSession, type CrmSessionInfo } from "@/lib/crm-settings-api";
import {
  getMobileNavLabel,
  isMobileNavActive,
  isMobilePlusActive,
  resolveMobileNav,
} from "@/lib/crm-mobile-nav";
import { CRM_SESSION_CHANGED_EVENT } from "@/lib/crm-session-events";
import { formatNavBadge, type CrmNavBadges } from "@/lib/crm-nav-badges";
import { fetchCrmNavBadges } from "@/lib/crm-nav-badges-api";
import { useCrmFetch } from "@/hooks/useCrmFetch";
import { useCrmPermissions } from "@/hooks/useCrmPermissions";
import { openCrmDocumentationWindow } from "@/lib/crm-docs-window";
import { cn } from "@/lib/utils";
import { LayoutGrid, X } from "lucide-react";

const NAV_BADGE_KEYS: Partial<Record<string, keyof CrmNavBadges>> = {
  leads: "leads",
  quotes: "quotes",
  tasks: "tasks",
  tickets: "tickets",
  inbox: "inbox",
};

export function CrmMobileNav() {
  const pathname = usePathname() ?? "";
  const { session, permissions } = useCrmPermissions();
  const [plusOpen, setPlusOpen] = useState(false);
  const [profile, setProfile] = useState<CrmSessionInfo | null>(session);

  const loadProfile = useCallback(() => {
    void fetchCrmSession()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    setProfile(session);
  }, [session]);

  useEffect(() => {
    loadProfile();
    window.addEventListener(CRM_SESSION_CHANGED_EVENT, loadProfile);
    return () => window.removeEventListener(CRM_SESSION_CHANGED_EVENT, loadProfile);
  }, [loadProfile]);

  useEffect(() => {
    setPlusOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!plusOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [plusOpen]);

  const { data: badges } = useCrmFetch("crm-nav-badges", fetchCrmNavBadges, 60_000);

  if (!session) return null;

  const { primary, secondary } = resolveMobileNav(permissions, session.role, {
    messagerieEnabled: Boolean(session.messagerieEnabled),
  });
  if (primary.length === 0) return null;

  const plusActive =
    isMobilePlusActive(pathname, secondary) || pathname.startsWith("/admin/crm/compte");
  const roleLabel =
    profile?.roleLabel ??
    CRM_ROLE_LABELS[profile?.role as keyof typeof CRM_ROLE_LABELS] ??
    profile?.role;

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray/40 bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] lg:hidden"
        aria-label="Navigation mobile CRM"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
          {primary.map((item) => {
            const active = isMobileNavActive(pathname, item.href);
            const Icon = item.icon;
            const badgeKey = NAV_BADGE_KEYS[item.id];
            const badgeCount = badgeKey && badges ? badges[badgeKey] : 0;
            const badgeLabel = formatNavBadge(badgeCount);
            return (
              <li key={item.id} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-semibold transition-colors",
                    active ? "text-primary" : "text-gray-text hover:text-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="relative">
                    <Icon className={cn("h-5 w-5 shrink-0", active && "text-primary")} aria-hidden />
                    {badgeLabel ? (
                      <span className="absolute -right-2.5 -top-1.5 min-w-[1rem] rounded-full bg-accent px-1 text-center text-[9px] font-bold leading-4 text-white">
                        {badgeLabel}
                      </span>
                    ) : null}
                  </span>
                  <span className="max-w-full truncate">{getMobileNavLabel(item)}</span>
                </Link>
              </li>
            );
          })}

          {secondary.length > 0 && (
            <li className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setPlusOpen(true)}
                className={cn(
                  "flex w-full flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-semibold transition-colors",
                  plusActive || plusOpen ? "text-primary" : "text-gray-text hover:text-foreground",
                )}
                aria-expanded={plusOpen}
                aria-haspopup="dialog"
              >
                <LayoutGrid
                  className={cn("h-5 w-5 shrink-0", (plusActive || plusOpen) && "text-primary")}
                  aria-hidden
                />
                <span>Plus</span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      {plusOpen && secondary.length > 0 && (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            className="fixed inset-0 z-50 bg-black/45 lg:hidden"
            onClick={() => setPlusOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Autres modules CRM"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[min(75vh,32rem)] overflow-hidden rounded-t-2xl border border-gray/30 bg-white shadow-2xl lg:hidden"
          >
            <div className="flex items-center justify-between border-b border-gray/30 px-4 py-3">
              <p className="text-sm font-bold text-foreground">Autres modules</p>
              <button
                type="button"
                onClick={() => setPlusOpen(false)}
                className="rounded-lg p-1.5 text-gray-text hover:bg-gray-light hover:text-foreground"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {profile && (
              <Link
                href="/admin/crm/compte"
                onClick={() => setPlusOpen(false)}
                className="flex items-center gap-3 border-b border-gray/20 px-4 py-3 hover:bg-gray-light/50"
              >
                <CrmUserAvatar name={profile.name} avatarUrl={profile.avatarUrl} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{profile.name}</p>
                  <p className="truncate text-xs text-gray-text">{roleLabel}</p>
                </div>
              </Link>
            )}

            <ul className="grid grid-cols-2 gap-1 overflow-y-auto p-3 sm:grid-cols-3">
              {secondary.map((item) => {
                const active = isMobileNavActive(pathname, item.href);
                const Icon = item.icon;
                const badgeKey = NAV_BADGE_KEYS[item.id];
                const badgeCount = badgeKey && badges ? badges[badgeKey] : 0;
                const badgeLabel = formatNavBadge(badgeCount);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={(e) => {
                        if (item.id === "documentation") {
                          e.preventDefault();
                          openCrmDocumentationWindow(item.href);
                        }
                        setPlusOpen(false);
                      }}
                      className={cn(
                        "relative flex flex-col items-center gap-2 rounded-xl px-3 py-4 text-center text-xs font-medium transition-colors",
                        active
                          ? "bg-primary text-white shadow-sm"
                          : "bg-gray-light/60 text-foreground hover:bg-gray-light",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden />
                      <span className="leading-tight">{item.label}</span>
                      {badgeLabel ? (
                        <span
                          className={cn(
                            "absolute right-2 top-2 min-w-[1.1rem] rounded-full px-1 text-center text-[9px] font-bold leading-4",
                            active ? "bg-white/25 text-white" : "bg-accent text-white",
                          )}
                        >
                          {badgeLabel}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <p className="border-t border-gray/20 px-4 py-2.5 text-center text-[10px] text-gray-text">
              Blog, site vitrine, rapports et marketing — disponibles sur ordinateur.
            </p>
          </div>
        </>
      )}
    </>
  );
}
