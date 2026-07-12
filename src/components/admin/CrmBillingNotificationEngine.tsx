"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  fetchAdminBillingNotifications,
  fetchAdminNotificationHistory,
  markAdminNotificationsRead,
  type CrmNotification,
} from "@/lib/billing-notifications-api";
import { cn } from "@/lib/utils";
import { Bell, FileSignature, CheckSquare, LifeBuoy, Receipt, X } from "lucide-react";

const POLL_MS = 30_000;

type BillingNotificationState = {
  history: CrmNotification[];
  unreadCount: number;
};

type Props = {
  onNotificationsChange?: (state: BillingNotificationState) => void;
};

function notificationIcon(notification: CrmNotification) {
  if (notification.category === "tasks" || notification.eventType.startsWith("task")) {
    return CheckSquare;
  }
  if (notification.category === "tickets" || notification.eventType.startsWith("ticket")) {
    return LifeBuoy;
  }
  if (notification.eventType.startsWith("invoice")) return Receipt;
  return FileSignature;
}

function notificationCategoryLabel(notification: CrmNotification): string {
  if (notification.category === "tasks" || notification.eventType.startsWith("task")) {
    return "Tâche";
  }
  if (notification.category === "tickets" || notification.eventType.startsWith("ticket")) {
    return "Support";
  }
  return "Facturation";
}

export function CrmBillingNotificationEngine({ onNotificationsChange }: Props) {
  const [toasts, setToasts] = useState<CrmNotification[]>([]);
  const shownRef = useRef<Set<string>>(new Set());
  const sinceRef = useRef<string | undefined>(undefined);

  const refreshHistory = useCallback(async () => {
    try {
      const { notifications, unreadCount } = await fetchAdminNotificationHistory();
      onNotificationsChange?.({ history: notifications, unreadCount });
    } catch {
      /* ignore */
    }
  }, [onNotificationsChange]);

  const pollNew = useCallback(async () => {
    try {
      const notifications = await fetchAdminBillingNotifications(sinceRef.current);
      const fresh = notifications.filter((n) => !shownRef.current.has(n.id));
      if (fresh.length === 0) return;

      const latest = fresh.reduce(
        (max, n) => (n.createdAt > max ? n.createdAt : max),
        fresh[0]!.createdAt,
      );
      sinceRef.current = latest;

      for (const notification of fresh) {
        shownRef.current.add(notification.id);
      }

      setToasts((prev) => [...fresh, ...prev].slice(0, 4));
      await markAdminNotificationsRead(fresh.map((n) => n.id));
      await refreshHistory();
    } catch {
      /* ignore poll errors */
    }
  }, [refreshHistory]);

  useEffect(() => {
    void refreshHistory();
    void pollNew();
    const id = window.setInterval(() => {
      void pollNew();
      void refreshHistory();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [pollNew, refreshHistory]);

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
      {toasts.map((notification) => {
        const Icon = notificationIcon(notification);
        return (
          <div
            key={notification.id}
            className={cn(
              "flex gap-3 rounded-2xl border border-primary/30 bg-white p-4 shadow-xl",
            )}
            role="alert"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">
                {notificationCategoryLabel(notification)}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{notification.title}</p>
              <p className="mt-1 text-xs text-gray-text">{notification.message}</p>
              {notification.linkHref && (
                <Link
                  href={notification.linkHref}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Bell className="h-3 w-3" aria-hidden />
                  Voir le détail
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(notification.id)}
              className="shrink-0 text-gray-text hover:text-foreground"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
