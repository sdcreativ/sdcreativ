"use client";

import { Bell, Menu, Plus } from "lucide-react";
import type { ClientProfileData } from "@/lib/client-portal-config";
import { clientSectionTitles } from "@/content/client-portal-nav";
import type { ClientPortalSection } from "@/content/client-portal-types";

type Props = {
  profile: ClientProfileData;
  section: ClientPortalSection;
  openTicketCount: number;
  messagesBadgeCount: number;
  onMenuClick: () => void;
  onNewRequest: () => void;
  onOpenSupport: () => void;
  onOpenMessages: () => void;
};

export function ClientPortalHeader({
  profile,
  section,
  openTicketCount,
  messagesBadgeCount,
  onMenuClick,
  onNewRequest,
  onOpenSupport,
  onOpenMessages,
}: Props) {
  const { title, subtitle } = clientSectionTitles[section];
  const notificationCount = openTicketCount + messagesBadgeCount;

  return (
    <header className="sticky top-0 z-10 border-b border-gray/40 bg-white px-4 py-4 md:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="mt-0.5 rounded-xl border border-gray/60 p-2.5 text-gray-text transition-colors hover:text-foreground lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-gray-text">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNewRequest}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Nouvelle demande</span>
          </button>

          <button
            type="button"
            onClick={messagesBadgeCount > 0 ? onOpenMessages : onOpenSupport}
            className="relative rounded-xl border border-gray/60 p-2.5 text-gray-text transition-colors hover:text-foreground"
            aria-label={
              notificationCount > 0
                ? `${notificationCount} notification(s) — tickets et messages`
                : "Notifications — tickets et messages"
            }
          >
            <Bell className="h-5 w-5" aria-hidden />
            {notificationCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>

          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white"
            title={profile.name}
            aria-hidden
          >
            {profile.initials}
          </div>
        </div>
      </div>
    </header>
  );
}
