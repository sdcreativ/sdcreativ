"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  fetchPortalBillingNotifications,
  fetchPortalNotificationHistory,
  markPortalNotificationsRead,
  type CrmNotification,
} from "@/lib/billing-notifications-api";
import { cn } from "@/lib/utils";
import { Bell, FileSignature, Receipt, X } from "lucide-react";

const POLL_MS = 30_000;

export type PortalNotificationState = {
  history: CrmNotification[];
  unreadCount: number;
};

type Props = {
  onNotificationsChange?: (state: PortalNotificationState) => void;
};

function notificationIcon(eventType: string) {
  if (eventType.startsWith("invoice")) return Receipt;
  return FileSignature;
}

export function ClientPortalNotificationEngine({ onNotificationsChange }: Props) {
  const [toasts, setToasts] = useState<CrmNotification[]>([]);
  const shownRef = useRef<Set<string>>(new Set());
  const sinceRef = useRef<string | undefined>(undefined);

  const refreshHistory = useCallback(async () => {
    try {
      const { notifications, unreadCount } = await fetchPortalNotificationHistory();
      onNotificationsChange?.({ history: notifications, unreadCount });
    } catch {
      /* ignore */
    }
  }, [onNotificationsChange]);

  const pollNew = useCallback(async () => {
    try {
      const notifications = await fetchPortalBillingNotifications(sinceRef.current);
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

      setToasts((prev) => [...fresh, ...prev].slice(0, 3));
      await markPortalNotificationsRead(fresh.map((n) => n.id));
      await refreshHistory();
    } catch {
      /* ignore */
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

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
      {toasts.map((notification) => {
        const Icon = notificationIcon(notification.eventType);
        return (
          <div
            key={notification.id}
            className={cn("flex gap-3 rounded-2xl border border-primary/30 bg-white p-4 shadow-xl")}
            role="alert"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{notification.title}</p>
              <p className="mt-1 text-xs text-gray-text">{notification.message}</p>
              {notification.linkHref && (
                <Link
                  href={notification.linkHref}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Consulter
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== notification.id))}
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
