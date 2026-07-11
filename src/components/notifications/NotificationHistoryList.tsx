"use client";

import Link from "next/link";
import type { CrmNotification } from "@/lib/billing/notifications";
import { cn } from "@/lib/utils";
import { FileSignature, Receipt } from "lucide-react";

function notificationIcon(eventType: string) {
  if (eventType.startsWith("invoice")) return Receipt;
  return FileSignature;
}

function formatNotificationDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH} h`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

type Props = {
  notifications: CrmNotification[];
  onNavigate?: () => void;
  onMarkRead?: (id: string) => void;
  emptyMessage?: string;
  accentClass?: string;
};

export function NotificationHistoryList({
  notifications,
  onNavigate,
  onMarkRead,
  emptyMessage = "Aucune notification récente.",
  accentClass = "text-emerald-700",
}: Props) {
  if (notifications.length === 0) {
    return <p className="px-4 py-3 text-sm text-gray-text">{emptyMessage}</p>;
  }

  return (
    <ul className="max-h-64 overflow-y-auto">
      {notifications.map((n) => {
        const Icon = notificationIcon(n.eventType);
        const unread = !n.readAt;
        const content = (
          <>
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", accentClass)} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="flex items-start gap-2">
                {unread && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
                )}
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">{n.title}</span>
                  <span className="block text-xs text-gray-text">{n.message}</span>
                  <span className="mt-0.5 block text-[10px] text-gray-text/80">
                    {formatNotificationDate(n.createdAt)}
                  </span>
                </span>
              </span>
            </span>
          </>
        );

        if (n.linkHref) {
          return (
            <li key={n.id}>
              <Link
                href={n.linkHref}
                onClick={() => {
                  if (unread) onMarkRead?.(n.id);
                  onNavigate?.();
                }}
                className="flex items-start gap-2 px-4 py-2.5 text-sm hover:bg-gray-light/50"
              >
                {content}
              </Link>
            </li>
          );
        }

        return (
          <li key={n.id}>
            <div className="flex items-start gap-2 px-4 py-2.5 text-sm">{content}</div>
          </li>
        );
      })}
    </ul>
  );
}
