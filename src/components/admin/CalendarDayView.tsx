"use client";

import {
  CALENDAR_ITEM_COLORS,
  DAY_HOURS,
  formatCalendarDateTime,
  formatDateKeyLabel,
  formatHourLabel,
  toDateKey,
} from "@/content/calendar-labels";
import type { CalendarItem } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { CALENDAR_EVENT_DRAG_MIME } from "@/components/admin/CalendarWeekView";

type Props = {
  day: Date;
  items: CalendarItem[];
  todayKey: string;
  onOpenEvent: (item: CalendarItem) => void;
  onMoveEvent: (sourceId: string, dateKey: string, hour: number) => void;
  onCreateOnDay: (dateKey: string) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
};

function isEditableEvent(item: CalendarItem): boolean {
  return item.source === "event" && Boolean(item.sourceId);
}

function eventHour(item: CalendarItem): number {
  const d = new Date(item.startsAt);
  return d.getHours();
}

export function CalendarDayView({
  day,
  items,
  todayKey,
  onOpenEvent,
  onMoveEvent,
  onCreateOnDay,
  onPrevDay,
  onNextDay,
}: Props) {
  const dayKey = toDateKey(day);
  const isToday = dayKey === todayKey;
  const dayItems = items.filter((i) => toDateKey(new Date(i.startsAt)) === dayKey);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between border-b border-slate-100 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-5 py-4">
        <button type="button" onClick={onPrevDay} className="rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm hover:border-primary/30 hover:text-primary" aria-label="Jour précédent">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <h2 className={cn("text-sm font-bold capitalize tracking-tight", isToday && "text-primary")}>
            {formatDateKeyLabel(dayKey)}
          </h2>
          <button type="button" onClick={() => onCreateOnDay(dayKey)} className="mt-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/10">
            + Ajouter un événement
          </button>
        </div>
        <button type="button" onClick={onNextDay} className="rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm hover:border-primary/30 hover:text-primary" aria-label="Jour suivant">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="max-h-[520px] overflow-y-auto">
        {DAY_HOURS.map((hour) => {
          const slotItems = dayItems.filter((i) => !i.allDay && eventHour(i) === hour);

          return (
            <div
              key={hour}
              className="flex border-b border-gray/10"
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
                  onMoveEvent(sourceId, dayKey, hour);
                } catch {
                  // ignore
                }
              }}
            >
              <div className="w-14 shrink-0 border-r border-gray/10 px-2 py-3 text-[10px] font-medium text-gray-text">
                {formatHourLabel(hour)}
              </div>
              <div className="min-h-[52px] flex-1 space-y-1 p-2">
                {slotItems.map((item) => {
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
                      }}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-xs",
                        CALENDAR_ITEM_COLORS[item.type],
                        editable && "cursor-grab",
                      )}
                    >
                      <button type="button" onClick={() => onOpenEvent(item)} className="w-full text-left">
                        <span className="flex items-center gap-1 font-semibold">
                          {editable && <GripVertical className="h-3 w-3 opacity-40" aria-hidden />}
                          {item.title}
                        </span>
                        <span className="text-[10px] opacity-80">{formatCalendarDateTime(item.startsAt, item.allDay)}</span>
                      </button>
                    </div>
                  );
                })}
                {slotItems.length === 0 && (
                  <span className="sr-only">Créneau libre</span>
                )}
              </div>
            </div>
          );
        })}

        {dayItems.filter((i) => i.allDay).length > 0 && (
          <div className="border-t border-gray/20 bg-gray-light/30 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase text-gray-text">Journée entière</p>
            <div className="space-y-1">
              {dayItems.filter((i) => i.allDay).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenEvent(item)}
                  className={cn("block w-full rounded-lg border px-2 py-1 text-left text-xs", CALENDAR_ITEM_COLORS[item.type])}
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
