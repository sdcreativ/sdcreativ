"use client";

import { LogOut } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import type { ClientProfileData } from "@/lib/client-portal-config";
import { clientNavItems } from "@/content/client-portal-nav";
import type { ClientPortalSection } from "@/content/client-portal-types";
import { cn } from "@/lib/utils";

type Props = {
  profile: ClientProfileData;
  section: ClientPortalSection;
  openTicketCount: number;
  messagesBadgeCount: number;
  quotesPendingCount: number;
  invoicesUnpaidCount: number;
  mobileOpen?: boolean;
  onSectionChange: (section: ClientPortalSection) => void;
  onLogout: () => void;
};

export function ClientPortalSidebar({
  profile,
  section,
  openTicketCount,
  messagesBadgeCount,
  quotesPendingCount,
  invoicesUnpaidCount,
  mobileOpen = false,
  onSectionChange,
  onLogout,
}: Props) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-screen w-[16.5rem] shrink-0 flex-col bg-gradient-to-b from-[#0a3d6b] via-[#0c4a80] to-[#071525] text-white transition-transform duration-200 ease-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
      aria-label="Navigation espace client"
    >
      <div className="border-b border-white/10 px-5 py-5">
        <Logo href="/" variant="mark" size="sidebar" className="inline-block" />
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
          Espace client
        </p>
      </div>

      <div className="border-b border-white/10 px-4 py-5">
        <button
          type="button"
          onClick={() => onSectionChange("overview")}
          className="flex w-full items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-left transition-colors hover:bg-white/15"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-sm font-bold shadow-inner">
            {profile.initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Bonjour {profile.name.split(" ")[0]}</p>
            <p className="truncate text-xs text-white/60">{profile.company}</p>
          </div>
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {clientNavItems.map(({ id, label, icon: Icon, ready }) => {
          const active = section === id;
          const badge =
            id === "support" && openTicketCount > 0
              ? openTicketCount
              : id === "messages" && messagesBadgeCount > 0
                ? messagesBadgeCount
                : id === "quotes" && quotesPendingCount > 0
                  ? quotesPendingCount
                  : id === "invoices" && invoicesUnpaidCount > 0
                    ? invoicesUnpaidCount
                    : undefined;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSectionChange(id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                active
                  ? "bg-white text-primary shadow-sm"
                  : "text-white/75 hover:bg-white/10 hover:text-white",
                !ready && "opacity-90",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{label}</span>
              {badge !== undefined && (
                <span
                  className={cn(
                    "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold",
                    active ? "bg-primary text-white" : "bg-accent text-white",
                  )}
                >
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
              {!ready && badge === undefined && (
                <span className="ml-auto text-[10px] text-white/40">Beta</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
