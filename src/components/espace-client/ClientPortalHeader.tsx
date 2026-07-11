"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, FileSignature, LifeBuoy, Menu, MessageSquare, Plus, Receipt } from "lucide-react";
import type { ClientProfileData } from "@/lib/client-portal-config";
import type { CrmNotification } from "@/lib/billing/notifications";
import { clientSectionTitles } from "@/content/client-portal-nav";
import type { ClientPortalSection } from "@/content/client-portal-types";
import { NotificationHistoryList } from "@/components/notifications/NotificationHistoryList";

type Props = {
  profile: ClientProfileData;
  section: ClientPortalSection;
  openTicketCount: number;
  messagesBadgeCount: number;
  quotesPendingCount: number;
  invoicesUnpaidCount: number;
  billingHistory: CrmNotification[];
  billingUnreadCount: number;
  onMenuClick: () => void;
  onNewRequest: () => void;
  onOpenSupport: () => void;
  onOpenMessages: () => void;
  onOpenQuotes: () => void;
  onOpenInvoices: () => void;
  onMarkBillingRead?: (id: string) => void;
  onMarkAllBillingRead?: () => void;
};

export function ClientPortalHeader({
  profile,
  section,
  openTicketCount,
  messagesBadgeCount,
  quotesPendingCount,
  invoicesUnpaidCount,
  billingHistory,
  billingUnreadCount,
  onMenuClick,
  onNewRequest,
  onOpenSupport,
  onOpenMessages,
  onOpenQuotes,
  onOpenInvoices,
  onMarkBillingRead,
  onMarkAllBillingRead,
}: Props) {
  const { title, subtitle } = clientSectionTitles[section];
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const notificationCount =
    openTicketCount +
    messagesBadgeCount +
    quotesPendingCount +
    invoicesUnpaidCount +
    billingUnreadCount;

  const hasActionItems =
    messagesBadgeCount > 0 ||
    openTicketCount > 0 ||
    quotesPendingCount > 0 ||
    invoicesUnpaidCount > 0;
  const hasAnyContent = hasActionItems || billingHistory.length > 0;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

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

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((open) => !open)}
              className="relative rounded-xl border border-gray/60 p-2.5 text-gray-text transition-colors hover:text-foreground"
              aria-label={
                notificationCount > 0
                  ? `${notificationCount} notification(s)`
                  : "Notifications"
              }
              aria-haspopup="menu"
              aria-expanded={notifOpen ? "true" : "false"}
            >
              <Bell className="h-5 w-5" aria-hidden />
              {notificationCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-gray/40 bg-white py-2 shadow-xl">
                <div className="flex items-center justify-between px-4 py-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-text">
                    Notifications
                  </p>
                  {billingUnreadCount > 0 && onMarkAllBillingRead && (
                    <button
                      type="button"
                      onClick={() => onMarkAllBillingRead()}
                      className="text-[10px] font-semibold text-primary hover:underline"
                    >
                      Tout marquer lu
                    </button>
                  )}
                </div>

                {!hasAnyContent ? (
                  <p className="px-4 py-3 text-sm text-gray-text">Aucune notification.</p>
                ) : (
                  <div className="divide-y divide-gray/20">
                    {hasActionItems && (
                      <div>
                        <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-primary">
                          À traiter
                        </p>
                        <ul>
                          {messagesBadgeCount > 0 && (
                            <li>
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenMessages();
                                  setNotifOpen(false);
                                }}
                                className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-light/50"
                              >
                                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                                <span className="font-medium text-foreground">
                                  {messagesBadgeCount} message(s) non lu(s)
                                </span>
                              </button>
                            </li>
                          )}
                          {openTicketCount > 0 && (
                            <li>
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenSupport();
                                  setNotifOpen(false);
                                }}
                                className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-light/50"
                              >
                                <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                                <span className="font-medium text-foreground">
                                  {openTicketCount} ticket(s) ouvert(s)
                                </span>
                              </button>
                            </li>
                          )}
                          {quotesPendingCount > 0 && (
                            <li>
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenQuotes();
                                  setNotifOpen(false);
                                }}
                                className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-light/50"
                              >
                                <FileSignature className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                                <span className="font-medium text-foreground">
                                  {quotesPendingCount} devis en attente
                                </span>
                              </button>
                            </li>
                          )}
                          {invoicesUnpaidCount > 0 && (
                            <li>
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenInvoices();
                                  setNotifOpen(false);
                                }}
                                className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-light/50"
                              >
                                <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                                <span className="font-medium text-foreground">
                                  {invoicesUnpaidCount} facture(s) impayée(s)
                                </span>
                              </button>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {billingHistory.length > 0 && (
                      <div>
                        <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          Historique
                          {billingUnreadCount > 0 && (
                            <span className="ml-1.5 rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] text-accent">
                              {billingUnreadCount} non lue{billingUnreadCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </p>
                        <NotificationHistoryList
                          notifications={billingHistory}
                          onNavigate={() => setNotifOpen(false)}
                          onMarkRead={onMarkBillingRead}
                          accentClass="text-emerald-700"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

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
