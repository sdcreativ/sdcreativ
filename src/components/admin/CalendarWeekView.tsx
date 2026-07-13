"use client";

import {
  CALENDAR_ITEM_COLORS,
  CALENDAR_ITEM_DOT_COLORS,
  formatDateKeyLabel,
  getWeekDays,
  toDateKey,
  WEEKDAY_LABELS,
} from "@/content/calendar-labels";
import type { CalendarItem } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";

export const CALENDAR_EVENT_DRAG_MIME = "application/x-sdcreativ-calendar-event";

type Props = {
  weekStart: Date;
  items: CalendarItem[];
  selectedDay: string;
  todayKey: string;
  onSelectDay: (key: string) => void;
  onOpenEvent: (item: CalendarItem) => void;
  onMoveEvent: (sourceId: string, dateKey: string) => void;
  onCreateOnDay: (dateKey: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
};

function isEditableEvent(item: CalendarItem): boolean {
  return item.source === "event" && Boolean(item.sourceId);
}

export function CalendarWeekView({
  weekStart,
  items,
  selectedDay,
  todayKey,
  onSelectDay,
  onOpenEvent,
  onMoveEvent,
  onCreateOnDay,
  onPrevWeek,
  onNextWeek,
}: Props) {
  const days = getWeekDays(weekStart);

  const itemsByDay = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const key = toDateKey(new Date(item.startsAt));
    const list = itemsByDay.get(key) ?? [];
    list.push(item);
    itemsByDay.set(key, list);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between border-b border-slate-100 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-5 py-4">
        <button type="button" onClick={onPrevWeek} className="rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm hover:border-primary/30 hover:text-primary" aria-label="Semaine précédente">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-sm font-bold capitalize tracking-tight text-foreground">
          Semaine du {formatDateKeyLabel(toDateKey(weekStart), { day: "numeric", month: "long" })}
        </h2>
        <button type="button" onClick={onNextWeek} className="rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm hover:border-primary/30 hover:text-primary" aria-label="Semaine suivante">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
        {days.map((date, i) => {
          const key = toDateKey(date);
          const isToday = key === todayKey;
          const isSelected = key === selectedDay;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(key)}
              className={cn(
                "border-r border-gray/10 px-2 py-2 text-center last:border-r-0",
                isSelected && "bg-primary-light/30",
              )}
            >
              <p className="text-[10px] font-bold uppercase text-gray-text">{WEEKDAY_LABELS[i]}</p>
              <span className={cn(
                "mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                isToday && "bg-primary text-white",
              )}>
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid min-h-[320px] grid-cols-7">
        {days.map((date) => {
          const key = toDateKey(date);
          const dayItems = itemsByDay.get(key) ?? [];

          return (
            <div
              key={key}
              className="border-r border-gray/10 p-1.5 last:border-r-0"
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
                  onMoveEvent(sourceId, key);
                } catch {
                  // ignore
                }
              }}
            >
              <button
                type="button"
                onClick={() => onCreateOnDay(key)}
                className="mb-1 w-full rounded-lg border border-dashed border-gray/30 py-0.5 text-[9px] text-gray-text hover:border-primary/40 hover:text-primary"
              >
                +
              </button>
              <div className="space-y-1">
                {dayItems.map((item) => {
                  const editable = isEditableEvent(item);
                  return (
                    <div
                      key={item.id}
                      draggable={editable}
                      onDragStart={(e) => {
                        if (!editable || !item.sourceId) return;
                        e.dataTransfer.setData(
                          CALENDAR_EVENT_DRAG_MIME,
                          JSON.stringify({ sourceId: item.sourceId }),
                        );
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className={cn(
                        "rounded-lg border px-1.5 py-1 text-left text-[10px] shadow-sm",
                        CALENDAR_ITEM_COLORS[item.type],
                        editable && "cursor-grab active:cursor-grabbing",
                      )}
                    >
                      <button type="button" onClick={() => onOpenEvent(item)} className="w-full text-left">
                        <span className="flex items-center gap-0.5 font-semibold leading-tight">
                          {editable && <GripVertical className="h-3 w-3 shrink-0 opacity-40" aria-hidden />}
                          {item.title}
                        </span>
                      </button>
                      <span className={cn("mt-0.5 inline-block h-1 w-1 rounded-full", CALENDAR_ITEM_DOT_COLORS[item.type])} aria-hidden />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
