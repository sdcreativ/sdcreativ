"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CALENDAR_ITEM_COLORS,
  CALENDAR_ITEM_DOT_COLORS,
  CALENDAR_ITEM_ACCENT,
  CALENDAR_ITEM_LABELS,
  EVENT_TYPE_LABELS,
  MONTH_LABELS,
  WEEKDAY_LABELS,
  addDays,
  endOfWeek,
  formatCalendarDateTime,
  formatDateKeyLabel,
  getMonthGrid,
  parseDateKey,
  startOfWeek,
  toDateKey,
} from "@/content/calendar-labels";
import { BOOKING } from "@/lib/constants";
import { useSitePublic } from "@/components/site/SitePublicProvider";
import { resolveWhatsappDigits } from "@/lib/site-public-resolver";
import type { CalendarItem } from "@/lib/calendar";
import { formatCountdownToEvent } from "@/lib/calendar-reminders";
import type { ParticipantInput, CalendarParticipant } from "@/lib/calendar-participants-shared";
import { RSVP_STATUS_LABELS, summarizeRsvp } from "@/lib/calendar-participants-shared";
import {
  createCalendarEventApi,
  deleteCalendarEventApi,
  fetchCalendarInvitationLogsApi,
  fetchCalendarItems,
  fetchCalendarItemsRange,
  fetchEventParticipants,
  moveCalendarEventApi,
  resendCalendarInvitationsApi,
  updateCalendarEventApi,
} from "@/lib/calendar-api";
import type { CalendarInvitationLog } from "@/lib/calendar-invitation-logs-shared";
import { INVITATION_LOG_STATUS_LABELS } from "@/lib/calendar-invitation-logs-shared";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";
import type { EventType, MeetingPlatform } from "@/content/calendar-labels";
import { MEETING_PLATFORM_LABELS, MEETING_PLATFORMS } from "@/content/calendar-labels";
import { CalendarParticipantPicker } from "@/components/admin/CalendarParticipantPicker";
import { CalendarDayView } from "@/components/admin/CalendarDayView";
import { CalendarReminderSettings } from "@/components/admin/CalendarReminderSettings";
import { CalendarSyncPanel } from "@/components/admin/CalendarSyncPanel";
import { CalendarWeekView } from "@/components/admin/CalendarWeekView";
import { CALENDAR_EVENT_DRAG_MIME } from "@/components/admin/CalendarWeekView";
import { useCrmAssignees } from "@/hooks/useCrmTeamMembers";
import { MailRichEditor } from "@/components/admin/MailRichEditor";
import type { CalendarEventAttachment } from "@/lib/calendar";
import { stripHtml } from "@/lib/blog-content";
import {
  CalendarDays,
  BellRing,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  ExternalLink,
  FileUp,
  LayoutGrid,
  Loader2,
  Mail,
  Paperclip,
  Pencil,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

type ViewMode = "month" | "week" | "day";

const calendarShell =
  "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]";
const calendarHeader =
  "flex items-center justify-between border-b border-slate-100 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-5 py-4";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type EventModalState =
  | { mode: "create"; date: string }
  | { mode: "edit"; item: CalendarItem }
  | null;

function isEditableEvent(item: CalendarItem): boolean {
  return item.source === "event" && Boolean(item.sourceId);
}

function startsAtToDateInput(iso: string): string {
  return toDateKey(new Date(iso));
}

export function CrmCalendarView() {
  const { confirm } = useDialog();
  const today = new Date();
  const todayKey = toDateKey(today);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [focusDay, setFocusDay] = useState(todayKey);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [eventModal, setEventModal] = useState<EventModalState>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let data: CalendarItem[];
      if (viewMode === "month") {
        data = await fetchCalendarItems(year, month);
      } else if (viewMode === "week") {
        const weekStart = startOfWeek(parseDateKey(selectedDay));
        const weekEnd = endOfWeek(weekStart);
        data = await fetchCalendarItemsRange(weekStart.toISOString(), weekEnd.toISOString());
      } else {
        const day = parseDateKey(focusDay);
        const from = new Date(day);
        from.setHours(0, 0, 0, 0);
        const to = new Date(day);
        to.setHours(23, 59, 59, 999);
        data = await fetchCalendarItemsRange(from.toISOString(), to.toISOString());
      }
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger le calendrier.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [viewMode, year, month, selectedDay, focusDay]);

  useEffect(() => {
    void load();
  }, [load]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = toDateKey(new Date(item.startsAt));
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const selectedItems = itemsByDay.get(selectedDay) ?? [];
  const grid = getMonthGrid(year, month);
  const monthEventCount = items.filter((item) => {
    const d = new Date(item.startsAt);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;

  const todayItems = itemsByDay.get(todayKey) ?? [];
  const monthMeetings = items.filter((i) => {
    const d = new Date(i.startsAt);
    return d.getFullYear() === year && d.getMonth() === month && (i.type === "meeting" || i.type === "call");
  }).length;
  const monthDeadlines = items.filter((i) => {
    const d = new Date(i.startsAt);
    return (
      d.getFullYear() === year &&
      d.getMonth() === month &&
      (i.type === "project_deadline" || i.type === "task_due")
    );
  }).length;

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const weekStart = startOfWeek(parseDateKey(selectedDay));

  function prevWeek() {
    const next = addDays(weekStart, -7);
    setSelectedDay(toDateKey(next));
  }

  function nextWeek() {
    const next = addDays(weekStart, 7);
    setSelectedDay(toDateKey(next));
  }

  function prevDay() {
    const next = addDays(parseDateKey(focusDay), -1);
    const key = toDateKey(next);
    setFocusDay(key);
    setSelectedDay(key);
  }

  function nextDay() {
    const next = addDays(parseDateKey(focusDay), 1);
    const key = toDateKey(next);
    setFocusDay(key);
    setSelectedDay(key);
  }

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    if (mode === "day") {
      setFocusDay(selectedDay);
    }
  }

  async function handleMoveEvent(sourceId: string, dateKey: string, hour?: number) {
    const item = items.find((i) => i.sourceId === sourceId);
    if (!item) return;
    const allDay = item.allDay;
    let effectiveHour = hour;
    if (!allDay && effectiveHour === undefined) {
      effectiveHour = new Date(item.startsAt).getHours();
    }
    try {
      await moveCalendarEventApi(sourceId, dateKey, effectiveHour, allDay);
      setSelectedDay(dateKey);
      if (viewMode === "day") setFocusDay(dateKey);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de déplacer l'événement.");
    }
  }

  function handleOpenEvent(item: CalendarItem) {
    if (isEditableEvent(item)) {
      openEditEvent(item);
      return;
    }
    const key = toDateKey(new Date(item.startsAt));
    setSelectedDay(key);
    if (viewMode === "day") setFocusDay(key);
  }

  function openCreateForDay(dateKey: string) {
    setSelectedDay(dateKey);
    setEventModal({ mode: "create", date: dateKey });
  }

  function openEditEvent(item: CalendarItem) {
    if (!isEditableEvent(item)) return;
    setSelectedDay(toDateKey(new Date(item.startsAt)));
    setEventModal({ mode: "edit", item });
  }

  function goToToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(todayKey);
    setFocusDay(todayKey);
  }

  async function handleDeleteEvent(sourceId: string) {
    const ok = await confirm({
      title: "Supprimer l'événement",
      message: "Supprimer cet événement ?",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    await deleteCalendarEventApi(sourceId);
    void load();
  }

  return (
    <div className="space-y-6">
      {/* Barre d'outils */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Calendrier</h2>
          <p className="mt-1 max-w-xl text-sm text-gray-text">
            Vue unifiée des réunions, échéances et relances commerciales.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200/80 bg-slate-50/80 p-1 shadow-sm">
            {([
              ["month", LayoutGrid, "Mois"],
              ["week", CalendarDays, "Semaine"],
              ["day", Clock, "Jour"],
            ] as const).map(([mode, Icon, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleViewModeChange(mode)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all",
                  viewMode === mode
                    ? "bg-white text-primary shadow-sm ring-1 ring-slate-200/80"
                    : "text-gray-text hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors",
              showSettings
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-slate-200/80 bg-white text-gray-text hover:text-foreground",
            )}
          >
            <Settings2 className="h-4 w-4" aria-hidden />
            Sync & rappels
            <ChevronDown className={cn("h-4 w-4 transition-transform", showSettings && "rotate-180")} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => openCreateForDay(viewMode === "day" ? focusDay : selectedDay)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/20"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nouvel événement
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Ce mois", value: monthEventCount, sub: "événements" },
          { label: "Aujourd'hui", value: todayItems.length, sub: "planifiés" },
          { label: "Réunions", value: monthMeetings, sub: "mois en cours" },
          { label: "Échéances", value: monthDeadlines, sub: "projets & tâches" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3.5 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-text/80">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
            <p className="text-xs text-gray-text">{stat.sub}</p>
          </div>
        ))}
      </div>

      {BOOKING.url && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary-light/40 to-white px-5 py-4">
          <div>
            <p className="font-semibold text-foreground">Prise de RDV Cal.com</p>
            <p className="text-sm text-gray-text">Planifiez un appel découverte de 30 min.</p>
          </div>
          <a
            href={BOOKING.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-white px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary-light/30"
          >
            {BOOKING.label}
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          <span className="font-medium">{error}</span>
          <button type="button" onClick={() => void load()} className="ml-auto text-xs font-semibold underline">
            Réessayer
          </button>
        </div>
      )}

      {showSettings && (
        <div className="space-y-4 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4">
          <CalendarReminderSettings />
          <CalendarSyncPanel />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray/30 bg-white py-24 text-sm text-gray-text shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
            Chargement du calendrier…
          </div>
        ) : viewMode === "week" ? (
          <CalendarWeekView
            weekStart={weekStart}
            items={items}
            selectedDay={selectedDay}
            todayKey={todayKey}
            onSelectDay={setSelectedDay}
            onOpenEvent={handleOpenEvent}
            onMoveEvent={(sourceId, dateKey) => void handleMoveEvent(sourceId, dateKey)}
            onCreateOnDay={openCreateForDay}
            onPrevWeek={prevWeek}
            onNextWeek={nextWeek}
          />
        ) : viewMode === "day" ? (
          <CalendarDayView
            day={parseDateKey(focusDay)}
            items={items}
            todayKey={todayKey}
            onOpenEvent={handleOpenEvent}
            onMoveEvent={(sourceId, dateKey, hour) => void handleMoveEvent(sourceId, dateKey, hour)}
            onCreateOnDay={openCreateForDay}
            onPrevDay={prevDay}
            onNextDay={nextDay}
          />
        ) : (
        <section className={calendarShell}>
          <div className={calendarHeader}>
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-xl border border-slate-200/80 bg-white p-2.5 text-gray-text shadow-sm transition-all hover:border-primary/30 hover:text-primary"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>

            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                {year}
              </p>
              <h2 className="mt-0.5 text-xl font-bold tracking-tight text-foreground">
                {MONTH_LABELS[month]}
              </h2>
              <button
                type="button"
                onClick={goToToday}
                className="mt-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                Aujourd&apos;hui
              </button>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="rounded-xl border border-slate-200/80 bg-white p-2.5 text-gray-text shadow-sm transition-all hover:border-primary/30 hover:text-primary"
              aria-label="Mois suivant"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="p-4 sm:p-5">
            <div className="mb-2 grid grid-cols-7 gap-1.5">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="py-2 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400"
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 rounded-2xl bg-slate-100/60 p-1.5">
              {grid.map((date) => {
                const key = toDateKey(date);
                const inMonth = date.getMonth() === month;
                const isToday = key === todayKey;
                const isSelected = key === selectedDay;
                const dayItems = itemsByDay.get(key) ?? [];
                const visibleItems = dayItems.slice(0, 2);
                const overflow = dayItems.length - visibleItems.length;

                return (
                  <div
                    key={key}
                    className={cn(
                      "group relative flex min-h-[5.5rem] flex-col rounded-xl border bg-white p-2 text-left transition-all sm:min-h-[6.25rem]",
                      !inMonth && "opacity-45",
                      isSelected && "border-primary/40 bg-primary/[0.04] ring-2 ring-primary/20",
                      !isSelected && "border-transparent hover:border-slate-200 hover:shadow-sm",
                    )}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const raw = e.dataTransfer.getData(CALENDAR_EVENT_DRAG_MIME);
                      if (!raw) return;
                      try {
                        const { sourceId } = JSON.parse(raw) as { sourceId: string };
                        void handleMoveEvent(sourceId, key);
                      } catch {
                        // ignore
                      }
                    }}
                  >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCreateForDay(key);
                          }}
                          className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-white opacity-0 shadow-md transition-all hover:bg-primary-dark group-hover:opacity-100"
                          aria-label={`Ajouter un événement le ${key}`}
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedDay(key)}
                          onDoubleClick={() => openCreateForDay(key)}
                          className="flex min-h-0 flex-1 cursor-pointer flex-col text-left"
                        >
                          <span
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold transition-all",
                              isToday && "bg-primary text-white shadow-md shadow-primary/30",
                              !isToday && isSelected && "bg-primary/10 text-primary",
                              !isToday && !isSelected && inMonth && "text-slate-700 group-hover:text-primary",
                              !inMonth && "text-slate-400",
                            )}
                          >
                            {date.getDate()}
                          </span>

                          {dayItems.length > 0 && (
                            <div className="mt-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                              {visibleItems.map((item) => {
                                const editable = isEditableEvent(item);
                                return (
                                  <span
                                    key={item.id}
                                    draggable={editable}
                                    onDragStart={(e) => {
                                      if (!editable || !item.sourceId) return;
                                      e.stopPropagation();
                                      e.dataTransfer.setData(
                                        CALENDAR_EVENT_DRAG_MIME,
                                        JSON.stringify({ sourceId: item.sourceId }),
                                      );
                                    }}
                                    className={cn(
                                      "block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[9px] font-medium leading-tight sm:text-[10px]",
                                      CALENDAR_ITEM_COLORS[item.type],
                                      editable && "cursor-grab active:cursor-grabbing",
                                    )}
                                  >
                                    {item.title}
                                  </span>
                                );
                              })}
                              {overflow > 0 && (
                                <span className="text-[9px] font-semibold text-slate-400">
                                  +{overflow} autre{overflow > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  })}
            </div>

            <Legend />
          </div>
        </section>
        )}

        <aside className={cn(calendarShell, "flex flex-col")}>
          <div className={cn(calendarHeader, "gap-4")}>
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                  {parseDateKey(selectedDay).toLocaleDateString("fr-FR", { weekday: "short" })}
                </span>
                <span className="text-2xl font-bold leading-none tabular-nums">
                  {parseDateKey(selectedDay).getDate()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">Agenda</p>
                <h3 className="truncate capitalize text-base font-bold text-foreground">
                  {formatDateKeyLabel(selectedDay, { weekday: "long", day: "numeric", month: "long" })}
                </h3>
                <p className="mt-0.5 text-sm text-gray-text">
                  {selectedItems.length} événement{selectedItems.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Sparkles className="h-6 w-6 text-slate-300" aria-hidden />
                </div>
                <p className="mt-4 font-semibold text-foreground">Journée libre</p>
                <p className="mt-1 text-sm text-gray-text">Aucun événement planifié.</p>
                <button
                  type="button"
                  onClick={() => openCreateForDay(selectedDay)}
                  className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Planifier
                </button>
              </div>
            ) : (
              <ul className="space-y-3">
                {selectedItems.map((item) => (
                  <AgendaDayItem
                    key={item.id}
                    item={item}
                    now={now}
                    onEdit={openEditEvent}
                    onDelete={handleDeleteEvent}
                  />
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {eventModal && (
        <EventFormModal
          key={
            eventModal.mode === "edit"
              ? `edit-${eventModal.item.sourceId ?? eventModal.item.id}`
              : `create-${eventModal.date}`
          }
          modal={eventModal}
          onClose={() => setEventModal(null)}
          onSaved={() => {
            setEventModal(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function AgendaDayItem({
  item,
  now,
  onEdit,
  onDelete,
}: {
  item: CalendarItem;
  now: Date;
  onEdit: (item: CalendarItem) => void;
  onDelete: (sourceId: string) => void;
}) {
  const editable = isEditableEvent(item);
  const countdown = formatCountdownToEvent(item.startsAt, now);
  const cardClass =
    "group relative overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm transition-all hover:border-slate-300/80 hover:shadow-md";

  const header = (
    <div className="flex items-start justify-between gap-2">
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-bold",
          CALENDAR_ITEM_COLORS[item.type],
        )}
      >
        {CALENDAR_ITEM_LABELS[item.type]}
      </span>
      {countdown && (
        <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
          <BellRing className="h-3 w-3" aria-hidden />
          {countdown}
        </span>
      )}
      {editable && item.sourceId && (
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={() => onEdit(item)}
            aria-label="Modifier"
            className="rounded-lg p-1 text-gray-text opacity-0 transition-opacity hover:bg-primary-light hover:text-primary group-hover:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => void onDelete(item.sourceId!)}
            aria-label="Supprimer"
            className="rounded-lg p-1 text-gray-text opacity-0 transition-opacity hover:bg-accent/10 hover:text-accent group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );

  const body = (
    <>
      <p className="mt-2 font-semibold leading-snug text-foreground">{item.title}</p>
      {item.description && (
        <p className="mt-0.5 line-clamp-2 text-xs text-gray-text">{stripHtml(item.description)}</p>
      )}
      <p className="mt-2 flex items-center gap-1 text-xs text-gray-text">
        <Clock className="h-3 w-3 shrink-0" aria-hidden />
        {formatCalendarDateTime(item.startsAt, item.allDay)}
        {item.assignee && ` · ${item.assignee}`}
      </p>
      {editable && item.sourceId && (item.attachmentNames?.length ?? 0) > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {item.attachmentNames!.map((name, index) => (
            <a
              key={`${name}-${index}`}
              href={`/api/admin/calendar/events/${item.sourceId}/attachment?index=${index}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Paperclip className="h-3 w-3" aria-hidden />
              {name}
            </a>
          ))}
        </div>
      )}
      {item.linkHref && (
        <Link
          href={item.linkHref}
          className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
        >
          Voir dans le CRM →
        </Link>
      )}
      {editable && (
        <p className="mt-2 text-[10px] text-gray-text/70">Cliquer pour modifier</p>
      )}
    </>
  );

  return (
    <li className={cn(cardClass, editable && "cursor-pointer")}>
      <span
        className={cn("absolute left-0 top-0 h-full w-1 rounded-l-xl", CALENDAR_ITEM_ACCENT[item.type])}
        aria-hidden
      />
      <div className="p-3.5">
        {header}
        {editable ? (
          <button type="button" onClick={() => onEdit(item)} className="w-full text-left">
            {body}
          </button>
        ) : (
          body
        )}
      </div>
    </li>
  );
}

function EventFormModal({
  modal,
  onClose,
  onSaved,
}: {
  modal: EventModalState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const assignees = useCrmAssignees();
  const { contact } = useSitePublic();
  const whatsappDigits = resolveWhatsappDigits(contact);
  const whatsappDisplay = whatsappDigits ? `+${whatsappDigits}` : null;
  const isEdit = modal?.mode === "edit";
  const item = isEdit ? modal.item : null;
  const defaultDate = modal?.mode === "create" ? modal.date : startsAtToDateInput(item!.startsAt);
  const defaultTime = isEdit && item && !item.allDay
    ? new Date(item.startsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "09:00";

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [inviteWarning, setInviteWarning] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [participants, setParticipants] = useState<ParticipantInput[]>([]);
  const [participantDetails, setParticipantDetails] = useState<CalendarParticipant[]>([]);
  const [sendInvitations, setSendInvitations] = useState(true);
  const [resendInvitations, setResendInvitations] = useState(false);
  const [savedEventId, setSavedEventId] = useState<string | null>(
    isEdit ? item?.sourceId ?? null : null,
  );
  const [allDay, setAllDay] = useState(item?.allDay ?? true);
  const [meetingPlatform, setMeetingPlatform] = useState<MeetingPlatform>("none");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState(item?.description ?? "");
  const [editorKey, setEditorKey] = useState(0);
  const [attachments, setAttachments] = useState<CalendarEventAttachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [generatingMeet, setGeneratingMeet] = useState(false);
  const [showInvitePreview, setShowInvitePreview] = useState(false);
  const [invitationLogs, setInvitationLogs] = useState<CalendarInvitationLog[]>([]);

  function loadInvitationLogs(eventId: string) {
    void fetchCalendarInvitationLogsApi(eventId)
      .then(setInvitationLogs)
      .catch(() => setInvitationLogs([]));
  }

  useEffect(() => {
    if (!isEdit || !item?.sourceId) {
      setParticipants([]);
      setParticipantDetails([]);
      setMeetingPlatform("none");
      setMeetingUrl("");
      setDescriptionHtml("");
      setAttachments([]);
      setInvitationLogs([]);
      setEditorKey((k) => k + 1);
      return;
    }
    setDescriptionHtml(item.description ?? "");
    setEditorKey((k) => k + 1);
    loadInvitationLogs(item.sourceId);
    void fetchEventParticipants(item.sourceId)
      .then((rows) => {
        setParticipantDetails(rows);
        setParticipants(
          rows.map((p) => ({ email: p.email, name: p.name, phone: p.phone })),
        );
      })
      .catch(() => {
        setParticipants([]);
        setParticipantDetails([]);
      });
    void fetch(`/api/admin/calendar/events/${item.sourceId}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          json: {
            event?: {
              meetingPlatform?: MeetingPlatform;
              meetingUrl?: string;
              description?: string | null;
              attachment?: CalendarEventAttachment | null;
              attachments?: CalendarEventAttachment[];
            };
          } | null,
        ) => {
          if (json?.event?.meetingPlatform) setMeetingPlatform(json.event.meetingPlatform);
          if (json?.event?.meetingUrl) setMeetingUrl(json.event.meetingUrl);
          if (json?.event?.description != null) {
            setDescriptionHtml(json.event.description);
            setEditorKey((k) => k + 1);
          }
          const files =
            json?.event?.attachments?.length
              ? json.event.attachments
              : json?.event?.attachment
                ? [json.event.attachment]
                : [];
          setAttachments(files);
        },
      )
      .catch(() => undefined);
  }, [isEdit, item?.sourceId, item?.description]);

  async function handleFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (attachments.length >= 5) {
      setError("Maximum 5 pièces jointes par événement.");
      return;
    }
    setUploadingFile(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/calendar/attachments", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const json = (await res.json()) as {
        attachment?: CalendarEventAttachment;
        error?: string;
      };
      if (!res.ok || !json.attachment) {
        throw new Error(json.error ?? "Upload impossible.");
      }
      setAttachments((prev) => [...prev, json.attachment!].slice(0, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload impossible.");
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(e.currentTarget);
    const date = String(data.get("date"));
    const time = String(data.get("time") || "09:00");
    const isAllDay = data.get("allDay") === "on";

    let startsAt = date;
    if (!isAllDay) {
      const [h, m] = time.split(":").map(Number);
      const d = parseDateKey(date);
      d.setHours(h, m ?? 0, 0, 0);
      startsAt = d.toISOString();
    }

    const existingId = savedEventId ?? (isEdit ? item?.sourceId : null) ?? null;
    const payload = {
      title: String(data.get("title")),
      description: descriptionHtml.trim() || null,
      type: String(data.get("type")),
      startsAt,
      allDay: isAllDay,
      assignee: String(data.get("assignee") || "") || null,
      participants,
      sendInvitations,
      ...(existingId && (resendInvitations || Boolean(inviteWarning))
        ? { resendInvitations: true }
        : {}),
      meetingPlatform,
      meetingUrl:
        meetingPlatform === "google_meet" || meetingPlatform === "zoom"
          ? meetingUrl.trim() || null
          : null,
      attachments,
      attachment: attachments[0] ?? null,
    };

    try {
      setInviteWarning("");
      const result = existingId
        ? await updateCalendarEventApi(existingId, payload)
        : await createCalendarEventApi(payload);

      setSavedEventId(result.event.id);
      loadInvitationLogs(result.event.id);
      void fetchEventParticipants(result.event.id)
        .then((rows) => {
          setParticipantDetails(rows);
          setParticipants(
            rows.map((p) => ({ email: p.email, name: p.name, phone: p.phone })),
          );
        })
        .catch(() => undefined);

      const inviteErrors = result.invited?.errors?.filter(Boolean) ?? [];
      if (sendInvitations && participants.length > 0 && inviteErrors.length > 0) {
        const first = inviteErrors[0]!;
        const domainHint = /domain is not verified/i.test(first)
          ? " Vérifiez le domaine sdcreativ.com sur https://resend.com/domains (DNS), puis réenregistrez avec « Renvoyer les invitations »."
          : "";
        setInviteWarning(
          `Événement enregistré, mais ${inviteErrors.length} invitation(s) e-mail ont échoué.${domainHint}`,
        );
        setResendInvitations(true);
        setError(first);
        return;
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendInvitations() {
    const eventId = savedEventId ?? item?.sourceId;
    if (!eventId) {
      setError("Enregistrez d’abord l’événement avant de renvoyer les invitations.");
      return;
    }
    if (participants.length === 0) {
      setError("Aucun participant sélectionné.");
      return;
    }
    setResending(true);
    setError("");
    setInviteWarning("");
    setInviteSuccess("");
    try {
      const invited = await resendCalendarInvitationsApi(eventId);
      const inviteErrors = invited.errors?.filter(Boolean) ?? [];
      if (inviteErrors.length > 0) {
        const first = inviteErrors[0]!;
        const domainHint = /domain is not verified/i.test(first)
          ? " Vérifiez le domaine sur https://resend.com/domains."
          : "";
        setInviteWarning(
          `${inviteErrors.length} invitation(s) ont échoué.${domainHint}`,
        );
        setError(first);
        return;
      }
      setInviteSuccess(
        `${invited.emails} invitation(s) renvoyée(s)${
          invited.whatsapp ? ` · ${invited.whatsapp} WhatsApp` : ""
        } (e-mail + .ics${attachments.length ? ` + ${attachments.length} pièce(s) jointe(s)` : ""}).`,
      );
      loadInvitationLogs(eventId);
      void fetchEventParticipants(eventId)
        .then(setParticipantDetails)
        .catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Renvoi impossible.");
    } finally {
      setResending(false);
    }
  }

  const defaultType = isEdit && item ? (item.type as EventType) : "meeting";
  const canResend = Boolean(savedEventId ?? item?.sourceId) && participants.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{isEdit ? "Modifier l'événement" : "Nouvel événement"}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="space-y-3">
          <input
            name="title"
            required
            placeholder="Titre *"
            defaultValue={item?.title ?? ""}
            className={fieldClass}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-text">Description</label>
            <MailRichEditor
              valueHtml={descriptionHtml}
              onChange={(html) => setDescriptionHtml(html)}
              disabled={loading}
              placeholder="Description de l’événement…"
              editorKey={editorKey}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-text">
              Pièces jointes (facultatif, max 5)
            </label>
            <p className="mb-2 text-[11px] text-gray-text/80">
              PDF, Word (.doc/.docx), Excel (.xls/.xlsx) ou image — max 10 Mo chacune.
            </p>
            {attachments.length > 0 && (
              <ul className="mb-2 space-y-2">
                {attachments.map((file, index) => (
                  <li
                    key={`${file.key ?? file.url}-${index}`}
                    className="flex items-center gap-2 rounded-xl border border-gray/40 bg-gray-light/40 px-3 py-2 text-sm"
                  >
                    <Paperclip className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <a
                      href={
                        isEdit && item?.sourceId
                          ? `/api/admin/calendar/events/${item.sourceId}/attachment?index=${index}`
                          : file.url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate font-medium text-primary hover:underline"
                    >
                      {file.name}
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="rounded-lg px-2 py-1 text-xs text-gray-text hover:bg-white hover:text-accent"
                    >
                      Retirer
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {attachments.length < 5 && (
              <label
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray/50 px-3 py-3 text-sm text-gray-text transition-colors hover:border-primary hover:bg-primary/5",
                  uploadingFile && "pointer-events-none opacity-60",
                )}
              >
                {uploadingFile ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <FileUp className="h-4 w-4" aria-hidden />
                )}
                {uploadingFile
                  ? "Upload en cours…"
                  : attachments.length > 0
                    ? "Ajouter un fichier"
                    : "Choisir un fichier"}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*"
                  disabled={loading || uploadingFile}
                  onChange={(e) => {
                    void handleFileChange(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="date"
              type="date"
              required
              defaultValue={defaultDate}
              className={fieldClass}
              aria-label="Date"
            />
            <select name="type" defaultValue={defaultType} className={fieldClass} aria-label="Type">
              {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          {!allDay && (
            <input
              name="time"
              type="time"
              defaultValue={defaultTime}
              className={fieldClass}
              aria-label="Heure"
            />
          )}
          <select
            name="assignee"
            defaultValue={item?.assignee ?? ""}
            className={fieldClass}
            aria-label="Assigné à"
          >
            <option value="">Non assigné</option>
            {assignees.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-text">Participants</label>
            <CalendarParticipantPicker value={participants} onChange={setParticipants} />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-gray-text">Canal de réunion</label>
            <div className="grid grid-cols-2 gap-2">
              {MEETING_PLATFORMS.map((platform) => (
                <label
                  key={platform}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                    meetingPlatform === platform
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-gray/30 hover:bg-gray-light/50",
                  )}
                >
                  <input
                    type="radio"
                    name="meetingPlatform"
                    value={platform}
                    checked={meetingPlatform === platform}
                    onChange={() => setMeetingPlatform(platform)}
                    className="text-primary"
                  />
                  {MEETING_PLATFORM_LABELS[platform]}
                </label>
              ))}
            </div>
            {meetingPlatform === "whatsapp" && (
              <p className="mt-2 text-xs text-gray-text">
                Les participants avec un numéro recevront aussi une notification WhatsApp.
                {whatsappDisplay
                  ? <> Lien généré vers <strong>{whatsappDisplay}</strong>.</>
                  : " Configurez le numéro WhatsApp dans Paramètres → Site public."}
              </p>
            )}
            {(meetingPlatform === "google_meet" || meetingPlatform === "zoom") && (
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder={
                      meetingPlatform === "google_meet"
                        ? "https://meet.google.com/xxx-xxxx-xxx"
                        : "https://zoom.us/j/123456789"
                    }
                    className={`${fieldClass} flex-1`}
                  />
                  <button
                    type="button"
                    disabled={loading || generatingMeet}
                    onClick={() => {
                      void (async () => {
                        setGeneratingMeet(true);
                        setError("");
                        try {
                          const res = await fetch("/api/admin/calendar/meeting-link", {
                            method: "POST",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              platform: meetingPlatform,
                              title: (document.querySelector('input[name="title"]') as HTMLInputElement | null)?.value,
                            }),
                          });
                          const json = (await res.json()) as {
                            url?: string | null;
                            openUrl?: string | null;
                            hint?: string | null;
                            error?: string;
                          };
                          if (!res.ok && !json.openUrl) {
                            throw new Error(json.error ?? "Génération impossible.");
                          }
                          if (json.url) setMeetingUrl(json.url);
                          if (json.openUrl) window.open(json.openUrl, "_blank", "noopener,noreferrer");
                          if (json.hint && !json.url) setInviteWarning(json.hint);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Génération impossible.");
                        } finally {
                          setGeneratingMeet(false);
                        }
                      })();
                    }}
                    className="shrink-0 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
                  >
                    {generatingMeet ? "…" : "Générer"}
                  </button>
                </div>
                <p className="text-[11px] text-gray-text/80">
                  {meetingPlatform === "google_meet"
                    ? "Google Meet : lien auto si Agenda Google connecté, sinon ouverture de Meet."
                    : "Zoom : ouvre la planification Zoom — collez ensuite le lien Join."}
                </p>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendInvitations}
              onChange={(e) => setSendInvitations(e.target.checked)}
              className="rounded border-gray/60"
            />
            Envoyer les invitations à la création / nouveaux participants (email + .ics)
          </label>
          {participants.length > 0 && (
            <button
              type="button"
              onClick={() => setShowInvitePreview(true)}
              className="text-left text-xs font-semibold text-primary hover:underline"
            >
              Prévisualiser le mail d’invitation
            </button>
          )}
          {showInvitePreview && (
            <div className="rounded-xl border border-gray/40 bg-gray-light/40 p-3 text-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">
                  Aperçu invitation
                </p>
                <button
                  type="button"
                  onClick={() => setShowInvitePreview(false)}
                  className="text-xs text-gray-text hover:text-foreground"
                >
                  Fermer
                </button>
              </div>
              <div className="space-y-2 rounded-lg bg-white p-3 text-xs leading-relaxed text-foreground">
                <p className="font-bold text-sm">{item?.title || "Titre de l’événement"}</p>
                <p>Date : selon le formulaire</p>
                {meetingUrl ? <p>Lien réunion : {meetingUrl}</p> : null}
                {attachments.length > 0 ? (
                  <p>Pièces jointes : {attachments.map((a) => a.name).join(", ")}</p>
                ) : null}
                <p className="pt-1 font-semibold">Votre réponse :</p>
                <p>Accepter · Peut-être · Refuser (+ fichier .ics joint)</p>
                <p className="text-gray-text">
                  Destinataires : {participants.map((p) => p.email).join(", ")}
                </p>
              </div>
            </div>
          )}
          {(isEdit || savedEventId) && (
            <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs text-gray-text">
                Renvoie l’invitation à <strong>tous</strong> les participants sélectionnés
                {attachments.length > 0
                  ? ` avec ${attachments.length} pièce(s) jointe(s)`
                  : ""}
                .
              </p>
              <button
                type="button"
                disabled={!canResend || resending || loading}
                onClick={() => void handleResendInvitations()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary bg-white px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-50"
              >
                {resending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Mail className="h-4 w-4" aria-hidden />
                )}
                {resending
                  ? "Envoi en cours…"
                  : "Renvoyer les invitations (+ pièce jointe)"}
              </button>
              <label className="flex items-center gap-2 text-xs text-gray-text">
                <input
                  type="checkbox"
                  checked={resendInvitations}
                  onChange={(e) => setResendInvitations(e.target.checked)}
                  disabled={!sendInvitations}
                  className="rounded border-gray/60"
                />
                Aussi renvoyer à l’enregistrement (Mettre à jour)
              </label>
            </div>
          )}
          {inviteSuccess && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {inviteSuccess}
            </p>
          )}
          {inviteWarning && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {inviteWarning}
            </p>
          )}
          {(isEdit || savedEventId) && participantDetails.length > 0 && (
            <div className="rounded-xl border border-gray/40 bg-gray-light/30 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-text">
                Réponses RSVP
              </p>
              {(() => {
                const summary = summarizeRsvp(participantDetails);
                return (
                  <p className="mb-2 text-xs text-gray-text">
                    {summary.accepted} accepté(s) · {summary.tentative} peut-être ·{" "}
                    {summary.declined} refusé(s) · {summary.pending} en attente
                  </p>
                );
              })()}
              <ul className="max-h-36 space-y-1.5 overflow-y-auto text-xs">
                {participantDetails.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-2 py-1.5"
                  >
                    <span className="min-w-0 truncate font-medium text-foreground">
                      {p.name || p.email}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        p.status === "accepted" && "bg-emerald-100 text-emerald-800",
                        p.status === "declined" && "bg-red-100 text-red-800",
                        p.status === "tentative" && "bg-amber-100 text-amber-900",
                        p.status === "pending" && "bg-gray-100 text-gray-600",
                      )}
                    >
                      {RSVP_STATUS_LABELS[p.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(isEdit || savedEventId) && invitationLogs.length > 0 && (
            <div className="rounded-xl border border-gray/40 bg-gray-light/30 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-text">
                Journal des invitations
              </p>
              <ul className="max-h-40 space-y-1.5 overflow-y-auto text-xs">
                {invitationLogs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-start gap-2 rounded-lg bg-white/80 px-2 py-1.5"
                  >
                    {log.status === "failed" || log.status === "bounced" || log.status === "complained" ? (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {log.email}
                        <span className="ml-1 font-normal text-gray-text">
                          · {log.channel === "whatsapp" ? "WhatsApp" : "Email"}
                        </span>
                      </p>
                      <p className="text-gray-text">
                        {new Date(log.sentAt).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" — "}
                        {INVITATION_LOG_STATUS_LABELS[log.status]}
                        {log.error ? ` (${log.error})` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              name="allDay"
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded border-gray/60"
            />
            Journée entière
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        <button
          type="submit"
          disabled={loading || uploadingFile}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {isEdit ? "Mettre à jour" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}

function Legend() {
  const types = Object.entries(CALENDAR_ITEM_LABELS) as Array<[keyof typeof CALENDAR_ITEM_LABELS, string]>;
  return (
    <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4">
      {types.map(([type, label]) => (
        <span
          key={type}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600"
        >
          <span className={cn("h-2 w-2 rounded-full", CALENDAR_ITEM_DOT_COLORS[type])} aria-hidden />
          {label}
        </span>
      ))}
    </div>
  );
}
