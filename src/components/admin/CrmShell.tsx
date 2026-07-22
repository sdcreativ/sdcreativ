"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { CrmAccessGuard } from "@/components/admin/CrmAccessGuard";
import { CrmBreadcrumbs } from "@/components/admin/CrmBreadcrumbs";
import { CrmBrandingProvider } from "@/components/admin/CrmBrandingProvider";
import { CrmBrandingStyles } from "@/components/admin/CrmBrandingStyles";
import { CrmHeader } from "@/components/admin/CrmHeader";
import { CrmReminderEngine } from "@/components/admin/CrmReminderEngine";
import { CrmBillingNotificationEngine } from "@/components/admin/CrmBillingNotificationEngine";
import { CrmSidebar } from "@/components/admin/CrmSidebar";
import { CrmMobileNav } from "@/components/admin/CrmMobileNav";
import { CrmMailboxOnboardingBanner } from "@/components/admin/CrmMailboxOnboardingBanner";
import { CrmIdleTimeoutWatcher } from "@/components/admin/CrmIdleTimeoutWatcher";
import { getCrmPageTitle } from "@/content/crm-nav";
import type { CalendarReminder } from "@/lib/calendar-reminders";
import type { CrmNotification } from "@/lib/billing/notifications";
import {
  fetchAdminNotificationHistory,
  markAdminNotificationsRead,
  markAllAdminNotificationsRead,
} from "@/lib/billing-notifications-api";
import { isCrmDocumentationPath } from "@/lib/crm-docs-window";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  subtitle?: string;
  showNewButton?: boolean;
};

export function CrmShell({ children, subtitle, showNewButton }: Props) {
  const pathname = usePathname() ?? "/admin/crm";
  const title = getCrmPageTitle(pathname);
  const docsWindow = isCrmDocumentationPath(pathname);
  const [calendarReminders, setCalendarReminders] = useState<CalendarReminder[]>([]);
  const [billingHistory, setBillingHistory] = useState<CrmNotification[]>([]);
  const [billingUnreadCount, setBillingUnreadCount] = useState(0);

  async function refreshBillingHistory() {
    try {
      const { notifications, unreadCount } = await fetchAdminNotificationHistory();
      setBillingHistory(notifications);
      setBillingUnreadCount(unreadCount);
    } catch {
      /* ignore */
    }
  }

  async function handleMarkBillingRead(id: string) {
    setBillingHistory((prev) => prev.filter((n) => n.id !== id));
    setBillingUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await markAdminNotificationsRead([id]);
    } catch {
      await refreshBillingHistory();
    }
  }

  async function handleMarkAllBillingRead() {
    setBillingHistory((prev) => prev.filter((n) => n.readAt));
    setBillingUnreadCount(0);
    try {
      await markAllAdminNotificationsRead();
    } catch {
      await refreshBillingHistory();
    }
  }

  if (docsWindow) {
    return (
      <CrmBrandingProvider>
        <div className="flex min-h-screen flex-col bg-[#eef2f7]">
          <CrmBrandingStyles />
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-gray/40 bg-white px-4 py-3 md:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-text">
                SD CREATIV CRM
              </p>
              <h1 className="truncate text-lg font-bold text-foreground">{title}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/admin/crm"
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray/40 px-3 py-2 text-sm font-semibold text-foreground hover:bg-gray-light/60"
              >
                Retour CRM
              </Link>
              <button
                type="button"
                onClick={() => window.close()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray/40 px-3 py-2 text-sm font-semibold text-gray-text hover:bg-gray-light/60"
                title="Fermer cette fenêtre"
              >
                <X className="h-4 w-4" aria-hidden />
                Fermer
              </button>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            <CrmAccessGuard>{children}</CrmAccessGuard>
          </div>
          <CrmIdleTimeoutWatcher />
        </div>
      </CrmBrandingProvider>
    );
  }

  return (
    <CrmBrandingProvider>
      <div className="flex min-h-screen bg-[#eef2f7]">
        <CrmBrandingStyles />

        <CrmSidebar />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-[15.5rem]">
          <CrmHeader
            title={title}
            subtitle={subtitle}
            showNewButton={showNewButton}
            calendarReminders={calendarReminders}
            billingHistory={billingHistory}
            billingUnreadCount={billingUnreadCount}
            onMarkBillingRead={(id) => void handleMarkBillingRead(id)}
            onMarkAllBillingRead={() => void handleMarkAllBillingRead()}
          />
          <div className={cn("flex-1 overflow-auto p-4 pb-24 md:p-6 md:pb-24 lg:p-8 lg:pb-8")}>
            <CrmBreadcrumbs />
            <CrmMailboxOnboardingBanner />
            <CrmAccessGuard>{children}</CrmAccessGuard>
          </div>
        </div>

        <CrmMobileNav />

        <CrmReminderEngine onRemindersChange={setCalendarReminders} />
        <CrmBillingNotificationEngine
          onNotificationsChange={({ history, unreadCount }) => {
            setBillingHistory(history);
            setBillingUnreadCount(unreadCount);
          }}
        />
        <CrmIdleTimeoutWatcher />
      </div>
    </CrmBrandingProvider>
  );
}
