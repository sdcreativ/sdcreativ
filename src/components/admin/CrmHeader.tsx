"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CRM_NEW_ITEM_PERMISSIONS, hasCrmPermission } from "@/lib/crm-access";
import { CRM_ROLE_LABELS } from "@/content/crm-roles";
import { useCrmPermissions } from "@/hooks/useCrmPermissions";
import { useCrmFetch } from "@/hooks/useCrmFetch";
import type { CalendarReminder } from "@/lib/calendar-reminders";
import type { CrmNotification } from "@/lib/billing/notifications";
import { NotificationHistoryList } from "@/components/notifications/NotificationHistoryList";
import { cn } from "@/lib/utils";
import { CrmUserAvatar } from "@/components/admin/CrmUserAvatar";
import { CrmGlobalSearch, type CrmGlobalSearchHandle } from "@/components/admin/CrmGlobalSearch";
import {
  Bell,
  CalendarClock,
  ChevronDown,
  ExternalLink,
  FileText,
  FolderKanban,
  Headphones,
  LifeBuoy,
  LogOut,
  Plus,
  Target,
  Users,
  CheckSquare,
} from "lucide-react";
import { fetchThreeCxWebClientUrl } from "@/lib/communications-api";

const NEW_ITEMS = [
  { label: "Lead", href: "/admin/crm/leads?create=1", icon: Target },
  { label: "Client", href: "/admin/crm/clients?create=1", icon: Users },
  { label: "Projet", href: "/admin/crm/projets?create=1", icon: FolderKanban },
  { label: "Devis", href: "/admin/crm/devis", icon: FileText },
  { label: "Tâche", href: "/admin/crm/taches?create=1", icon: CheckSquare },
  { label: "Ticket", href: "/admin/crm/tickets?create=1", icon: LifeBuoy },
] as const;

type Props = {
  title: string;
  subtitle?: string;
  showNewButton?: boolean;
  calendarReminders?: CalendarReminder[];
  billingHistory?: CrmNotification[];
  billingUnreadCount?: number;
  onMarkBillingRead?: (id: string) => void;
  onMarkAllBillingRead?: () => void;
};

export function CrmHeader({
  title,
  subtitle,
  showNewButton = true,
  calendarReminders = [],
  billingHistory = [],
  billingUnreadCount = 0,
  onMarkBillingRead,
  onMarkAllBillingRead,
}: Props) {
  const [newOpen, setNewOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [dismissedOperational, setDismissedOperational] = useState<Set<string>>(() => new Set());
  const [webClientUrl, setWebClientUrl] = useState<string | null>(null);
  const { session, permissions } = useCrmPermissions();
  const canTasks = hasCrmPermission(permissions, "tasks.read");
  const canTickets = hasCrmPermission(permissions, "tickets.read");
  const canSearch = hasCrmPermission(permissions, [
    "leads.read",
    "clients.read",
    "projects.read",
    "quotes.read",
  ]);
  const canCommunications = hasCrmPermission(permissions, "communications.read");
  const newItems = NEW_ITEMS.filter((item) =>
    hasCrmPermission(permissions, CRM_NEW_ITEM_PERMISSIONS[item.label]),
  );
  const { data: taskStats } = useCrmFetch(
    canTasks ? "crm-task-stats" : "crm-task-stats-off",
    () =>
      canTasks
        ? fetch("/api/admin/tasks/stats", { credentials: "include" }).then((r) => r.json())
        : Promise.resolve(null),
  );
  const { data: ticketStats } = useCrmFetch(
    canTickets ? "crm-ticket-stats" : "crm-ticket-stats-off",
    () =>
      canTickets
        ? fetch("/api/admin/tickets/stats", { credentials: "include" }).then((r) => r.json())
        : Promise.resolve(null),
  );
  const newRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const newBtnRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<CrmGlobalSearchHandle>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (canSearch) searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [canSearch]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (newRef.current && !newRef.current.contains(e.target as Node)) setNewOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const overdueTasks = canTasks ? (taskStats?.overdue ?? 0) : 0;
  const slaBreached = canTickets ? (ticketStats?.slaBreached ?? 0) : 0;
  const openTickets = canTickets ? (ticketStats?.open ?? 0) + (ticketStats?.inProgress ?? 0) : 0;
  const unreadHistory = billingHistory.filter((n) => !n.readAt);
  const taskNotifications = unreadHistory.filter((n) => n.category === "tasks");
  const billingOnly = unreadHistory.filter((n) => n.category !== "tasks");

  const operationalAlerts = [
    calendarReminders.length > 0 ? "calendar" : null,
    canTasks && overdueTasks > 0 ? "overdue-tasks" : null,
    canTickets && slaBreached > 0 ? "sla-breached" : null,
    canTickets && openTickets > 0 ? "open-tickets" : null,
  ].filter((key): key is string => key !== null && !dismissedOperational.has(key));

  const operationalCount = operationalAlerts.length;
  /** Total d’éléments (pas seulement le nombre de catégories d’alerte). */
  const alertCount =
    (dismissedOperational.has("calendar") ? 0 : calendarReminders.length) +
    (dismissedOperational.has("overdue-tasks") ? 0 : overdueTasks) +
    (dismissedOperational.has("sla-breached") ? 0 : slaBreached) +
    (dismissedOperational.has("open-tickets") ? 0 : openTickets) +
    billingUnreadCount;
  const hasOperationalAlerts = operationalCount > 0;
  const hasAnyAlerts = alertCount > 0;
  const [hydrated, setHydrated] = useState(false);

  function dismissOperational(key: string) {
    setDismissedOperational((prev) => new Set(prev).add(key));
  }

  useEffect(() => {
    setDismissedOperational(new Set());
  }, [overdueTasks, slaBreached, openTickets, calendarReminders.length]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!canCommunications) {
      setWebClientUrl(null);
      return;
    }
    let cancelled = false;
    void fetchThreeCxWebClientUrl().then((url) => {
      if (!cancelled) setWebClientUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [canCommunications]);

  useEffect(() => {
    notifBtnRef.current?.setAttribute("aria-expanded", notifOpen ? "true" : "false");
  }, [notifOpen]);

  useEffect(() => {
    newBtnRef.current?.setAttribute("aria-expanded", newOpen ? "true" : "false");
  }, [newOpen]);

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray/40 bg-white px-4 py-4 md:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-gray-text">{subtitle}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canSearch && <CrmGlobalSearch ref={searchRef} />}

          {canCommunications && webClientUrl ? (
            <a
              href={webClientUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-gray/60 px-3 py-2.5 text-sm font-medium text-gray-text transition-colors hover:border-primary/40 hover:text-foreground"
              title="Ouvrir le Web Client 3CX"
            >
              <Headphones className="h-4 w-4 text-primary" aria-hidden />
              <span className="hidden sm:inline">Web Client 3CX</span>
              <ExternalLink className="hidden h-3.5 w-3.5 sm:inline" aria-hidden />
            </a>
          ) : null}

          <div className="relative" ref={notifRef}>
            <button
              ref={notifBtnRef}
              type="button"
              onClick={() => setNotifOpen((open) => !open)}
              className="relative rounded-xl border border-gray/60 p-2.5 text-gray-text transition-colors hover:text-foreground"
              aria-label="Notifications"
              aria-haspopup="menu"
            >
              <Bell className="h-5 w-5" aria-hidden />
              {hydrated && alertCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                className={cn(
                  "absolute right-0 top-full z-20 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-gray/40 bg-white py-2 shadow-xl",
                  "max-sm:fixed max-sm:left-1/2 max-sm:right-auto max-sm:top-[4.75rem] max-sm:-translate-x-1/2 max-sm:mt-0",
                )}
              >
                <div className="flex items-center justify-between px-4 py-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-text">
                    Notifications
                  </p>
                  {billingUnreadCount > 0 && onMarkAllBillingRead && (
                    <button
                      type="button"
                      onClick={() => {
                        onMarkAllBillingRead();
                      }}
                      className="text-[10px] font-semibold text-primary hover:underline"
                    >
                      Tout marquer lu
                    </button>
                  )}
                </div>
                {!hasAnyAlerts ? (
                  <p className="px-4 py-3 text-sm text-gray-text">Aucune alerte.</p>
                ) : (
                  <div className="divide-y divide-gray/20">
                    {hasOperationalAlerts && (
                      <div>
                        <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-primary">
                          Alertes opérationnelles
                        </p>
                        <ul>
                          {calendarReminders.length > 0 &&
                            !dismissedOperational.has("calendar") &&
                            calendarReminders.slice(0, 5).map((r) => (
                              <li key={r.key}>
                                <Link
                                  href={r.linkHref ?? "/admin/crm/calendrier"}
                                  onClick={() => {
                                    dismissOperational("calendar");
                                    setNotifOpen(false);
                                  }}
                                  className="flex items-start gap-2 px-4 py-2.5 text-sm hover:bg-gray-light/50"
                                >
                                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                                  <span className="font-medium text-foreground">{r.message}</span>
                                </Link>
                              </li>
                            ))}
                          {canTasks && overdueTasks > 0 && !dismissedOperational.has("overdue-tasks") && (
                            <li>
                              <Link
                                href="/admin/crm/taches"
                                onClick={() => {
                                  dismissOperational("overdue-tasks");
                                  setNotifOpen(false);
                                }}
                                className="block px-4 py-3 text-sm hover:bg-gray-light/50"
                              >
                                <span className="font-semibold text-foreground">
                                  {overdueTasks} tâche(s) en retard
                                </span>
                              </Link>
                            </li>
                          )}
                          {canTickets && slaBreached > 0 && !dismissedOperational.has("sla-breached") && (
                            <li>
                              <Link
                                href="/admin/crm/tickets"
                                onClick={() => {
                                  dismissOperational("sla-breached");
                                  setNotifOpen(false);
                                }}
                                className="block px-4 py-3 text-sm hover:bg-gray-light/50"
                              >
                                <span className="font-semibold text-accent">
                                  {slaBreached} ticket(s) SLA dépassé
                                </span>
                              </Link>
                            </li>
                          )}
                          {canTickets && openTickets > 0 && !dismissedOperational.has("open-tickets") && (
                            <li>
                              <Link
                                href="/admin/crm/tickets"
                                onClick={() => {
                                  dismissOperational("open-tickets");
                                  setNotifOpen(false);
                                }}
                                className="block px-4 py-3 text-sm hover:bg-gray-light/50"
                              >
                                <span className="text-gray-text">
                                  {openTickets} ticket(s) ouvert(s)
                                </span>
                              </Link>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    {billingOnly.length > 0 && (
                      <div>
                        <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          Facturation
                          {billingUnreadCount > 0 && (
                            <span className="ml-1.5 rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] text-accent">
                              {billingUnreadCount} non lue{billingUnreadCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </p>
                        <NotificationHistoryList
                          notifications={billingOnly}
                          onNavigate={() => setNotifOpen(false)}
                          onMarkRead={onMarkBillingRead}
                        />
                      </div>
                    )}
                    {taskNotifications.length > 0 && (
                      <div>
                        <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-primary">
                          Tâches assignées
                        </p>
                        <NotificationHistoryList
                          notifications={taskNotifications}
                          onNavigate={() => setNotifOpen(false)}
                          onMarkRead={onMarkBillingRead}
                          accentClass="text-primary"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {showNewButton && newItems.length > 0 && (
            <div className="relative" ref={newRef}>
              <button
                ref={newBtnRef}
                type="button"
                onClick={() => setNewOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
                aria-haspopup="menu"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Nouveau
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", newOpen && "rotate-180")}
                  aria-hidden
                />
              </button>

              {newOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-gray/40 bg-white py-1 shadow-xl">
                  {newItems.map(({ label, href, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setNewOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-gray-light/50"
                    >
                      <Icon className="h-4 w-4 text-primary" aria-hidden />
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {session && (
            <Link
              href="/admin/crm/compte"
              className="hidden items-center gap-2 rounded-xl border border-gray/40 bg-gray-light/30 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-gray-light/60 md:inline-flex"
            >
              <CrmUserAvatar name={session.name} avatarUrl={session.avatarUrl} size="sm" />
              <span className="max-w-[10rem] truncate">{session.name}</span>
              <span className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold text-primary">
                {session.roleLabel ?? CRM_ROLE_LABELS[session.role as keyof typeof CRM_ROLE_LABELS] ?? session.role}
              </span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray/60 px-3 py-2.5 text-sm font-medium text-gray-text transition-colors hover:text-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
}
