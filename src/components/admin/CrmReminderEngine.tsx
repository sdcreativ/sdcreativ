"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  acknowledgeCalendarReminders,
  fetchCalendarReminders,
} from "@/lib/calendar-reminders-api";
import type { CalendarReminder } from "@/lib/calendar-reminders";
import { cn } from "@/lib/utils";
import { Bell, CalendarClock, X } from "lucide-react";

const POLL_MS = 45_000;

type Props = {
  onRemindersChange?: (reminders: CalendarReminder[]) => void;
};

export function CrmReminderEngine({ onRemindersChange }: Props) {
  const [toasts, setToasts] = useState<CalendarReminder[]>([]);
  const shownRef = useRef<Set<string>>(new Set());
  const permissionAskedRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const { reminders } = await fetchCalendarReminders();
      onRemindersChange?.(reminders);

      const fresh = reminders.filter((r) => !shownRef.current.has(r.key));
      if (fresh.length === 0) return;

      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "default" &&
        !permissionAskedRef.current
      ) {
        permissionAskedRef.current = true;
        void Notification.requestPermission();
      }

      for (const reminder of fresh) {
        shownRef.current.add(reminder.key);

        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          const n = new Notification("SD CREATIV — Calendrier", {
            body: reminder.message,
            tag: reminder.key,
            icon: "/favicon.ico",
          });
          n.onclick = () => {
            window.focus();
            window.location.href = reminder.linkHref ?? "/admin/crm/calendrier";
          };
        }
      }

      setToasts((prev) => {
        const merged = [...fresh, ...prev].slice(0, 4);
        return merged;
      });

      await acknowledgeCalendarReminders(
        fresh.map((r) => ({
          key: r.key,
          itemId: r.itemId,
          itemType: r.itemType,
          title: r.title,
          triggerAt: r.triggerAt,
          channels: ["in_app"],
        })),
      );
    } catch {
      /* ignore poll errors */
    }
  }, [onRemindersChange]);

  useEffect(() => {
    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => window.clearInterval(id);
  }, [poll]);

  function dismissToast(key: string) {
    setToasts((prev) => prev.filter((t) => t.key !== key));
  }

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
      {toasts.map((reminder) => (
        <div
          key={reminder.key}
          className={cn(
            "flex gap-3 rounded-2xl border bg-white p-4 shadow-xl",
            reminder.urgency === "high" ? "border-accent/40" : "border-primary/30",
          )}
          role="alert"
        >
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              reminder.urgency === "high" ? "bg-accent/10 text-accent" : "bg-primary-light text-primary",
            )}
          >
            <Bell className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Rappel calendrier</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{reminder.message}</p>
            <Link
              href={reminder.linkHref ?? "/admin/crm/calendrier"}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <CalendarClock className="h-3 w-3" aria-hidden />
              Voir le calendrier
            </Link>
          </div>
          <button
            type="button"
            onClick={() => dismissToast(reminder.key)}
            className="shrink-0 text-gray-text hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
