"use client";

import { CalendarDays, MessageCircle, PhoneCall, X } from "lucide-react";

const COPY = {
  fr: {
    title: "Comment souhaitez-vous continuer ?",
    book: "Réserver un appel de 30 min",
    whatsapp: "Continuer sur WhatsApp",
    callback: "Être rappelé",
    close: "Fermer",
  },
  en: {
    title: "How would you like to continue?",
    book: "Book a 30-min call",
    whatsapp: "Continue on WhatsApp",
    callback: "Get a call back",
    close: "Close",
  },
} as const;

/**
 * Suites proposées dans la conversation : rendez-vous (Cal.com), WhatsApp avec le contexte de la conversation,
 * ou demande de rappel. Chaque suite est rattachée à la conversation côté CRM.
 */
export function ChatNextSteps({
  locale,
  whatsappHref,
  canBook,
  onBook,
  onWhatsapp,
  onCallback,
  onDismiss,
}: {
  locale: "fr" | "en";
  whatsappHref: string;
  canBook: boolean;
  onBook: () => void;
  onWhatsapp: () => void;
  onCallback: () => void;
  onDismiss: () => void;
}) {
  const t = COPY[locale];
  const item =
    "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[0.9em] font-semibold transition-colors";
  return (
    <div className="relative rounded-2xl border border-[var(--kady-accent)]/40 bg-white p-3 text-foreground shadow-sm" role="group" aria-label={t.title}>
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-2 top-2 rounded p-1 text-gray-text hover:bg-gray-light"
        aria-label={t.close}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
      <p className="pr-6 text-[0.95em] font-semibold">{t.title}</p>
      <div className="mt-2 space-y-2">
        {canBook && (
          <button
            type="button"
            onClick={onBook}
            className={`${item} border-[var(--kady-accent)] bg-[var(--kady-accent)] text-[var(--kady-accent-text)] hover:opacity-90`}
          >
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
            {t.book}
          </button>
        )}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onWhatsapp}
          data-track-cta="chat_whatsapp"
          className={`${item} border-[#25D366] bg-[#25D366] text-white hover:bg-[#1EBE5A]`}
        >
          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
          {t.whatsapp}
        </a>
        <button type="button" onClick={onCallback} className={`${item} border-gray/50 bg-white hover:bg-gray-light`}>
          <PhoneCall className="h-4 w-4 shrink-0" aria-hidden />
          {t.callback}
        </button>
      </div>
    </div>
  );
}
