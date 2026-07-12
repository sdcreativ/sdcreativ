"use client";

import { useState } from "react";
import type { ClientProfileData } from "@/lib/client-portal-config";
import type { CrmNotification } from "@/lib/billing/notifications";
import { ClientPortalHeader } from "@/components/espace-client/ClientPortalHeader";
import { ClientPortalSidebar } from "@/components/espace-client/ClientPortalSidebar";
import type { ClientPortalSection } from "@/content/client-portal-types";

type Props = {
  profile: ClientProfileData;
  section: ClientPortalSection;
  activeProjectId?: string | null;
  onProjectChange?: (projectId: string) => void;
  openTicketCount: number;
  messagesBadgeCount: number;
  quotesPendingCount: number;
  invoicesUnpaidCount: number;
  billingHistory: CrmNotification[];
  billingUnreadCount: number;
  onSectionChange: (section: ClientPortalSection) => void;
  onNewRequest: () => void;
  onLogout: () => void;
  onMarkBillingRead?: (id: string) => void;
  onMarkAllBillingRead?: () => void;
  children: React.ReactNode;
};

export function ClientPortalShell({
  profile,
  section,
  activeProjectId,
  onProjectChange,
  openTicketCount,
  messagesBadgeCount,
  quotesPendingCount,
  invoicesUnpaidCount,
  billingHistory,
  billingUnreadCount,
  onSectionChange,
  onNewRequest,
  onLogout,
  onMarkBillingRead,
  onMarkAllBillingRead,
  children,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleSectionChange(next: ClientPortalSection) {
    setSidebarOpen(false);
    onSectionChange(next);
  }

  return (
    <div className="flex min-h-screen bg-[#eef2f7]">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <ClientPortalSidebar
        profile={profile}
        section={section}
        activeProjectId={activeProjectId}
        onProjectChange={onProjectChange}
        openTicketCount={openTicketCount}
        messagesBadgeCount={messagesBadgeCount}
        quotesPendingCount={quotesPendingCount}
        invoicesUnpaidCount={invoicesUnpaidCount}
        mobileOpen={sidebarOpen}
        onSectionChange={handleSectionChange}
        onLogout={onLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:ml-[16.5rem]">
        <ClientPortalHeader
          profile={profile}
          section={section}
          openTicketCount={openTicketCount}
          messagesBadgeCount={messagesBadgeCount}
          quotesPendingCount={quotesPendingCount}
          invoicesUnpaidCount={invoicesUnpaidCount}
          billingHistory={billingHistory}
          billingUnreadCount={billingUnreadCount}
          onMenuClick={() => setSidebarOpen(true)}
          onNewRequest={onNewRequest}
          onOpenSupport={() => handleSectionChange("support")}
          onOpenMessages={() => handleSectionChange("messages")}
          onOpenQuotes={() => handleSectionChange("quotes")}
          onOpenInvoices={() => handleSectionChange("invoices")}
          onMarkBillingRead={onMarkBillingRead}
          onMarkAllBillingRead={onMarkAllBillingRead}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
