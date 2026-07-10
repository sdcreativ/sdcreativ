"use client";

import { useState } from "react";
import { CrmAccessGuard } from "@/components/admin/CrmAccessGuard";
import { CrmBreadcrumbs } from "@/components/admin/CrmBreadcrumbs";
import { CrmBrandingProvider } from "@/components/admin/CrmBrandingProvider";
import { CrmBrandingStyles } from "@/components/admin/CrmBrandingStyles";
import { CrmHeader } from "@/components/admin/CrmHeader";
import { CrmReminderEngine } from "@/components/admin/CrmReminderEngine";
import { CrmBillingNotificationEngine } from "@/components/admin/CrmBillingNotificationEngine";
import { CrmSidebar } from "@/components/admin/CrmSidebar";
import { getCrmPageTitle } from "@/content/crm-nav";
import type { CalendarReminder } from "@/lib/calendar-reminders";
import type { CrmNotification } from "@/lib/billing/notifications";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

type Props = {
  children: React.ReactNode;
  subtitle?: string;
  showNewButton?: boolean;
};

export function CrmShell({ children, subtitle, showNewButton }: Props) {
  const pathname = usePathname() ?? "/admin/crm";
  const title = getCrmPageTitle(pathname);
  const [calendarReminders, setCalendarReminders] = useState<CalendarReminder[]>([]);
  const [billingNotifications, setBillingNotifications] = useState<CrmNotification[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <CrmBrandingProvider>
      <div className="flex min-h-screen bg-[#eef2f7]">
        <CrmBrandingStyles />
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Fermer le menu"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <CrmSidebar mobileOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-[15.5rem]">
          <CrmHeader
            title={title}
            subtitle={subtitle}
            showNewButton={showNewButton}
            calendarReminders={calendarReminders}
            billingNotifications={billingNotifications}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <div className={cn("flex-1 overflow-auto p-4 md:p-6 lg:p-8")}>
            <CrmBreadcrumbs />
            <CrmAccessGuard>{children}</CrmAccessGuard>
          </div>
        </div>

        <CrmReminderEngine onRemindersChange={setCalendarReminders} />
        <CrmBillingNotificationEngine onNotificationsChange={setBillingNotifications} />
      </div>
    </CrmBrandingProvider>
  );
}
