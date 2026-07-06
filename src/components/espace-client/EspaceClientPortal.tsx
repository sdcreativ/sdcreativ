"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { DocumentsPanel } from "@/components/documents/DocumentsPanel";
import { ClientPortalComingSoon } from "@/components/espace-client/ClientPortalComingSoon";
import { ClientPortalMessagesView } from "@/components/espace-client/ClientPortalMessagesView";
import { ClientPortalDashboard } from "@/components/espace-client/ClientPortalDashboard";
import { ClientPortalGuest } from "@/components/espace-client/ClientPortalGuest";
import { ClientPortalPaymentsView } from "@/components/espace-client/ClientPortalPaymentsView";
import { ClientPortalProjectView } from "@/components/espace-client/ClientPortalProjectView";
import { ClientPortalShell } from "@/components/espace-client/ClientPortalShell";
import { ClientPortalSupportView } from "@/components/espace-client/ClientPortalSupportView";
import type { ClientPortalSection, ProjectStep } from "@/content/client-portal-types";
import type { ClientProfileData } from "@/lib/client-portal-config";
import type { PortalProjectPayload } from "@/lib/client-portal-db";
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
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [clientId, setClientId] = useState("");
  const [profile, setProfile] = useState<ClientProfileData | null>(null);
  const [section, setSection] = useState<ClientPortalSection>("overview");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [supportCreateOpen, setSupportCreateOpen] = useState(false);
  const [projectSteps, setProjectSteps] = useState<ProjectStep[] | null>(null);

  const applySession = useCallback((session: SessionPayload) => {
    setClientId(session.clientId);
    setProfile(session.profile);
    setSessionState("authenticated");
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
      const res = await fetch("/api/espace-client/project", { credentials: "include" });
      if (!res.ok) {
        setProjectSteps(null);
        return;
      }
      const json = (await res.json()) as PortalProjectPayload;
      setProjectSteps(json.milestones.length > 0 ? json.milestones : null);
    } catch {
      setProjectSteps(null);
    }
  }, []);

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
    if (sessionState !== "authenticated") return;

    void loadTickets();
    void loadPortalProject();
    void refreshProfile();

    const interval = window.setInterval(() => {
      void loadTickets();
      void loadPortalProject();
      void refreshProfile();
    }, PORTAL_POLL_MS);

    return () => window.clearInterval(interval);
  }, [sessionState, section, loadTickets, loadPortalProject, refreshProfile]);

  function openSupportWithCreate() {
    setSection("support");
    setSupportCreateOpen(true);
  }

  function handleSectionChange(next: ClientPortalSection) {
    setSection(next);
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
    <ClientPortalShell
      profile={profile}
      section={section}
      openTicketCount={openTicketCount}
      messagesBadgeCount={messagesBadgeCount}
      onSectionChange={handleSectionChange}
      onNewRequest={openSupportWithCreate}
      onLogout={() => void logout()}
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

      {section === "invoices" && (
        <DocumentsPanel mode="client" clientId={clientId} initialCategory="invoices" />
      )}

      {section === "payments" && <ClientPortalPaymentsView />}

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
        <ClientPortalComingSoon
          title="Paramètres du compte"
          description="Modifiez vos coordonnées, préférences de notification et sécurité du compte."
        />
      )}
    </ClientPortalShell>
  );
}
