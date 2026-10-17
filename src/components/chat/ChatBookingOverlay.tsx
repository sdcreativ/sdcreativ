"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { buildBookingEmbedUrl } from "@/lib/booking";
import { BOOKING } from "@/lib/constants";

/**
 * URL Cal.com pré-remplie depuis le chat : nom, e-mail, besoin, et référence de conversation transmise
 * à Cal.com (métadonnée) puis renvoyée par le webhook pour rattacher le rendez-vous à la conversation.
 */
export function buildChatBookingUrl(input: {
  conversationId: string;
  notes: string;
  name?: string;
  email?: string;
}): string | null {
  if (!BOOKING.url && !BOOKING.embedUrl) return null;
  const url = new URL(buildBookingEmbedUrl(BOOKING.url, BOOKING.embedUrl));
  if (input.name) url.searchParams.set("name", input.name);
  if (input.email) url.searchParams.set("email", input.email);
  if (input.notes) url.searchParams.set("notes", input.notes.slice(0, 500));
  url.searchParams.set("metadata[chatConversationId]", input.conversationId);
  return url.toString();
}

/** Calendrier Cal.com par-dessus le site : le visiteur réserve sans quitter la page ni la conversation. */
export function ChatBookingOverlay({ src, locale, onClose }: { src: string; locale: "fr" | "en"; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = locale === "en" ? "Book a 30-minute call" : "Réserver un appel de 30 min";
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-0 backdrop-blur-sm sm:p-6" role="dialog" aria-label={title}>
      <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl sm:h-[min(760px,100%)] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray/40 px-4 py-3">
          <p className="font-semibold text-foreground">{title}</p>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-light" aria-label={locale === "en" ? "Close" : "Fermer"}>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <iframe src={src} title={title} className="min-h-0 w-full flex-1 border-0" loading="lazy" />
      </div>
    </div>
  );
}
