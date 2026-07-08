"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CRM_NEW_ITEM_PERMISSIONS, hasCrmPermission } from "@/lib/crm-access";
import { CRM_ROLE_LABELS } from "@/content/crm-roles";
import { useCrmPermissions } from "@/hooks/useCrmPermissions";
import { useCrmFetch } from "@/hooks/useCrmFetch";
import type { CalendarReminder } from "@/lib/calendar-reminders";
import { cn } from "@/lib/utils";
import { CrmGlobalSearch, type CrmGlobalSearchHandle } from "@/components/admin/CrmGlobalSearch";
import {
  Bell,
  CalendarClock,
  ChevronDown,
  FileText,
  FolderKanban,
  LifeBuoy,
  LogOut,
  Menu,
  Plus,
  Target,
  Users,
  CheckSquare,
} from "lucide-react";

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
  onMenuClick?: () => void;
};

export function CrmHeader({
  title,
  subtitle,
  showNewButton = true,
  calendarReminders = [],
  onMenuClick,
}: Props) {
  const [newOpen, setNewOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { session, permissions } = useCrmPermissions();
  const canTasks = hasCrmPermission(permissions, "tasks.read");
  const canTickets = hasCrmPermission(permissions, "tickets.read");
  const canSearch = hasCrmPermission(permissions, [
    "leads.read",
    "clients.read",
    "projects.read",
    "quotes.read",
  ]);
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
  const alertCount = overdueTasks + slaBreached + calendarReminders.length;
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

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
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="rounded-xl border border-gray/60 p-2.5 text-gray-text hover:text-foreground lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-gray-text">{subtitle}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canSearch && <CrmGlobalSearch ref={searchRef} />}

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
              <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-gray/40 bg-white py-2 shadow-xl">
                <p className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-text">
                  Alertes
                </p>
                {alertCount === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-text">Aucune alerte.</p>
                ) : (
                  <ul className="divide-y divide-gray/20">
                    {calendarReminders.length > 0 && (
                      <li>
                        <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-primary">
                          Rappels calendrier
                        </p>
                        {calendarReminders.slice(0, 5).map((r) => (
                          <Link
                            key={r.key}
                            href={r.linkHref ?? "/admin/crm/calendrier"}
                            onClick={() => setNotifOpen(false)}
                            className="flex items-start gap-2 px-4 py-2.5 text-sm hover:bg-gray-light/50"
                          >
                            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                            <span className="font-medium text-foreground">{r.message}</span>
                          </Link>
                        ))}
                      </li>
                    )}
                    {canTasks && overdueTasks > 0 && (
                      <li>
                        <Link
                          href="/admin/crm/taches"
                          onClick={() => setNotifOpen(false)}
                          className="block px-4 py-3 text-sm hover:bg-gray-light/50"
                        >
                          <span className="font-semibold text-foreground">
                            {overdueTasks} tâche(s) en retard
                          </span>
                        </Link>
                      </li>
                    )}
                    {canTickets && slaBreached > 0 && (
                      <li>
                        <Link
                          href="/admin/crm/tickets"
                          onClick={() => setNotifOpen(false)}
                          className="block px-4 py-3 text-sm hover:bg-gray-light/50"
                        >
                          <span className="font-semibold text-accent">
                            {slaBreached} ticket(s) SLA dépassé
                          </span>
                        </Link>
                      </li>
                    )}
                    {canTickets && openTickets > 0 && (
                      <li>
                        <Link
                          href="/admin/crm/tickets"
                          onClick={() => setNotifOpen(false)}
                          className="block px-4 py-3 text-sm hover:bg-gray-light/50"
                        >
                          <span className="text-gray-text">
                            {openTickets} ticket(s) ouvert(s)
                          </span>
                        </Link>
                      </li>
                    )}
                  </ul>
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
              href="/admin/compte"
              className="hidden items-center gap-2 rounded-xl border border-gray/40 bg-gray-light/30 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-gray-light/60 md:inline-flex"
            >
              <span>{session.name}</span>
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
