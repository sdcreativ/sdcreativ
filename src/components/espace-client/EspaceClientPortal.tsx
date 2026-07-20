"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DocumentsPanel } from "@/components/documents/DocumentsPanel";
import { ClientPortalSettingsView } from "@/components/espace-client/ClientPortalSettingsView";
import { ClientPortalMessagesView } from "@/components/espace-client/ClientPortalMessagesView";
import { ClientPortalDashboard } from "@/components/espace-client/ClientPortalDashboard";
import { ClientPortalGuest } from "@/components/espace-client/ClientPortalGuest";
import { ClientPortalPaymentsView } from "@/components/espace-client/ClientPortalPaymentsView";
import { ClientPortalProjectView } from "@/components/espace-client/ClientPortalProjectView";
import { ClientPortalQuotesView } from "@/components/espace-client/ClientPortalQuotesView";
import { ClientPortalInvoicesView } from "@/components/espace-client/ClientPortalInvoicesView";
import { ClientPortalOffersView } from "@/components/espace-client/ClientPortalOffersView";
import { ClientPortalNotificationEngine } from "@/components/espace-client/ClientPortalNotificationEngine";
import { ClientPortalShell } from "@/components/espace-client/ClientPortalShell";
import { ClientPortalSupportView } from "@/components/espace-client/ClientPortalSupportView";
import type { ClientPortalSection, ProjectStep } from "@/content/client-portal-types";
import type { ClientProfileData } from "@/lib/client-portal-config";
import type { CrmNotification } from "@/lib/billing/notifications";
import {
  fetchPortalNotificationHistory,
  markAllPortalNotificationsRead,
  markPortalNotificationsRead,
} from "@/lib/billing-notifications-api";
import {
  applyPortalProjectToProfile,
  type PortalProjectPayload,
} from "@/lib/client-portal-project";
import { countMessagesAttention, countOpenTickets } from "@/lib/client-portal-utils";
import type { Ticket } from "@/lib/tickets";

type SessionState = "loading" | "guest" | "authenticated";

type SessionPayload = {
  clientId: string;
  profile: ClientProfileData;
};

type SessionResponse =
  | { authenticated: false }
  | { authenticated: true; clientId: string; profile: ClientProfileData };

function isAuthenticatedSession(json: SessionResponse): json is SessionPayload & { authenticated: true } {
  return json.authenticated === true && "clientId" in json && "profile" in json;
}

const PORTAL_POLL_MS = 30_000;

export function EspaceClientPortal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [clientId, setClientId] = useState("");
  const [profile, setProfile] = useState<ClientProfileData | null>(null);
  const [section, setSection] = useState<ClientPortalSection>("overview");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [quotesPendingCount, setQuotesPendingCount] = useState(0);
  const [invoicesUnpaidCount, setInvoicesUnpaidCount] = useState(0);
  const [billingHistory, setBillingHistory] = useState<CrmNotification[]>([]);
  const [billingUnreadCount, setBillingUnreadCount] = useState(0);
  const [supportCreateOpen, setSupportCreateOpen] = useState(false);
  const [projectSteps, setProjectSteps] = useState<ProjectStep[] | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const portalProjectStorageKey = clientId ? `portal_project_${clientId}` : null;

  const applySession = useCallback((session: SessionPayload) => {
    setClientId(session.clientId);
    setProfile(session.profile);
    setSessionState("authenticated");
    const stored = window.localStorage.getItem(`portal_project_${session.clientId}`);
    setActiveProjectId(stored ?? session.profile.crmProjectId ?? null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/espace-client/session", { credentials: "include" });
      if (!res.ok) return;
      const json = (await res.json()) as SessionResponse;
      if (!isAuthenticatedSession(json)) return;
      setProfile(json.profile);
    } catch {
      /* ignore */
    }
  }, []);

  const loadPortalProject = useCallback(async () => {
    try {
      const qs = activeProjectId ? `?projectId=${encodeURIComponent(activeProjectId)}` : "";
      const res = await fetch(`/api/espace-client/project${qs}`, { credentials: "include" });
      if (!res.ok) {
        setProjectSteps(null);
        return;
      }
      const json = (await res.json()) as PortalProjectPayload;
      setProjectSteps(json.milestones.length > 0 ? json.milestones : null);
      setProfile((prev) => (prev ? applyPortalProjectToProfile(prev, json) : prev));
      if (json.crmProjectId) {
        setActiveProjectId(json.crmProjectId);
      }
    } catch {
      setProjectSteps(null);
    }
  }, [activeProjectId]);

  const loadTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/espace-client/tickets", { credentials: "include" });
      if (!res.ok) {
        setTickets([]);
        return;
      }
      const json = (await res.json()) as { tickets: Ticket[] };
      setTickets(json.tickets ?? []);
    } catch {
      setTickets([]);
    }
  }, []);

  const loadQuotes = useCallback(async () => {
    try {
      const res = await fetch("/api/espace-client/quotes", { credentials: "include" });
      if (!res.ok) {
        setQuotesPendingCount(0);
        return;
      }
      const json = (await res.json()) as { pendingCount?: number };
      setQuotesPendingCount(json.pendingCount ?? 0);
    } catch {
      setQuotesPendingCount(0);
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    try {
      const res = await fetch("/api/espace-client/invoices", { credentials: "include" });
      if (!res.ok) {
        setInvoicesUnpaidCount(0);
        return;
      }
      const json = (await res.json()) as { unpaidCount?: number };
      setInvoicesUnpaidCount(json.unpaidCount ?? 0);
    } catch {
      setInvoicesUnpaidCount(0);
    }
  }, []);

  const refreshBillingHistory = useCallback(async () => {
    try {
      const { notifications, unreadCount } = await fetchPortalNotificationHistory();
      setBillingHistory(notifications);
      setBillingUnreadCount(unreadCount);
    } catch {
      /* ignore */
    }
  }, []);

  async function handleMarkBillingRead(id: string) {
    setBillingHistory((prev) => prev.filter((n) => n.id !== id));
    setBillingUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await markPortalNotificationsRead([id]);
    } catch {
      await refreshBillingHistory();
    }
  }

  async function handleMarkAllBillingRead() {
    setBillingHistory((prev) => prev.filter((n) => n.readAt));
    setBillingUnreadCount(0);
    try {
      await markAllPortalNotificationsRead();
    } catch {
      await refreshBillingHistory();
    }
  }

  const checkSession = useCallback(async () => {
    setSessionState("loading");

    try {
      const res = await fetch("/api/espace-client/session", { credentials: "include" });
      if (!res.ok) {
        setSessionState("guest");
        return;
      }

      const json = (await res.json()) as SessionResponse;
      if (!isAuthenticatedSession(json)) {
        setSessionState("guest");
        return;
      }

      applySession(json);
    } catch {
      setSessionState("guest");
    }
  }, [applySession]);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    const sectionParam = searchParams.get("section");
    const allowed: ClientPortalSection[] = [
      "overview",
      "project",
      "messages",
      "files",
      "payments",
      "quotes",
      "invoices",
      "offers",
      "support",
      "settings",
    ];
    if (sectionParam && allowed.includes(sectionParam as ClientPortalSection)) {
      setSection(sectionParam as ClientPortalSection);
    }
  }, [searchParams]);

  useEffect(() => {
    if (sessionState !== "authenticated") return;

    void loadTickets();
    void loadPortalProject();
    void loadQuotes();
    void loadInvoices();
    void refreshProfile();

    const interval = window.setInterval(() => {
      void loadTickets();
      void loadPortalProject();
      void loadQuotes();
      void loadInvoices();
      void refreshProfile();
    }, PORTAL_POLL_MS);

    return () => window.clearInterval(interval);
  }, [sessionState, loadTickets, loadPortalProject, loadQuotes, loadInvoices, refreshProfile]);

  const handleProjectChange = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
    if (portalProjectStorageKey) {
      window.localStorage.setItem(portalProjectStorageKey, projectId);
    }
  }, [portalProjectStorageKey]);

  function openSupportWithCreate() {
    setSection("support");
    setSupportCreateOpen(true);
  }

  function handleSectionChange(next: ClientPortalSection) {
    setSection(next);
    router.replace(`/espace-client?section=${next}`, { scroll: false });
    if (next !== "support") {
      setSupportCreateOpen(false);
    }
  }

  async function logout() {
    await fetch("/api/espace-client/login", { method: "DELETE", credentials: "include" });
    setClientId("");
    setProfile(null);
    setTickets([]);
    setSection("overview");
    setSupportCreateOpen(false);
    setSessionState("guest");
  }

  if (sessionState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-[#eef2f7] text-sm text-gray-text">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        Chargement de l&apos;espace client…
      </div>
    );
  }

  if (sessionState === "guest") {
    return (
      <ClientPortalGuest
        onSuccess={(session) => {
          applySession(session);
        }}
      />
    );
  }

  if (!profile) return null;

  const openTicketCount = countOpenTickets(tickets);
  const messagesBadgeCount = countMessagesAttention(tickets);

  return (
    <>
      <ClientPortalShell
      profile={profile}
      section={section}
      activeProjectId={activeProjectId}
      onProjectChange={handleProjectChange}
      openTicketCount={openTicketCount}
      messagesBadgeCount={messagesBadgeCount}
      quotesPendingCount={quotesPendingCount}
      invoicesUnpaidCount={invoicesUnpaidCount}
      billingHistory={billingHistory}
      billingUnreadCount={billingUnreadCount}
      onSectionChange={handleSectionChange}
      onNewRequest={openSupportWithCreate}
      onLogout={() => void logout()}
      onMarkBillingRead={(id) => void handleMarkBillingRead(id)}
      onMarkAllBillingRead={() => void handleMarkAllBillingRead()}
    >
      {section === "overview" && (
        <ClientPortalDashboard
          profile={profile}
          tickets={tickets}
          projectSteps={projectSteps}
          onOpenFiles={() => handleSectionChange("files")}
          onOpenProject={() => handleSectionChange("project")}
          onOpenPayments={() => handleSectionChange("payments")}
          onOpenMessages={() => handleSectionChange("messages")}
          onOpenSupport={openSupportWithCreate}
        />
      )}

      {section === "project" && (
        <ClientPortalProjectView profile={profile} projectSteps={projectSteps} />
      )}

      {section === "files" && <DocumentsPanel mode="client" clientId={clientId} />}

      {section === "invoices" && <ClientPortalInvoicesView />}

      {section === "payments" && <ClientPortalPaymentsView />}

      {section === "quotes" && <ClientPortalQuotesView />}

      {section === "offers" && <ClientPortalOffersView />}

      {section === "messages" && (
        <ClientPortalMessagesView profile={profile} onTicketsChange={loadTickets} />
      )}

      {section === "support" && (
        <ClientPortalSupportView
          profile={profile}
          openCreateOnMount={supportCreateOpen}
          onCreateClosed={() => setSupportCreateOpen(false)}
          onTicketsChange={loadTickets}
        />
      )}

      {section === "settings" && (
        <ClientPortalSettingsView onProfileUpdated={() => void refreshProfile()} />
      )}
      </ClientPortalShell>
      <ClientPortalNotificationEngine
        onNotificationsChange={({ history, unreadCount }) => {
          setBillingHistory(history);
          setBillingUnreadCount(unreadCount);
        }}
      />
    </>
  );
}
