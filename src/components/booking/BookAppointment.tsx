"use client";

import { Calendar, ExternalLink } from "lucide-react";
import { BOOKING } from "@/lib/constants";
import { isBookingConfigured } from "@/lib/booking";
import { cn } from "@/lib/utils";

type BookAppointmentProps = {
  className?: string;
  /** Conservé pour compat — l’embed iframe/JS est désactivé (popups bloqués). */
  variant?: "card" | "inline" | "embed";
};

/**
 * Lien Cal.com en navigation classique (même onglet, pas de target=_blank, pas de window.open).
 * Évite about:blank#blocked des bloqueurs de popups.
 */
function BookingLink({
  className,
  children,
  inline,
}: {
  className?: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  const href = BOOKING.url || BOOKING.embedUrl;
  if (!href) return null;

  return (
    <a
      href={href}
      className={
        inline
          ? cn(
              "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-md shadow-primary/20 transition hover:bg-primary-dark",
              className,
            )
          : cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 transition hover:bg-primary-dark",
              className,
            )
      }
    >
      {children}
    </a>
  );
}

function BookingCard({ className }: { className?: string }) {
  const href = BOOKING.url || BOOKING.embedUrl;
  if (!href) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-gray/60 bg-white shadow-sm",
        className,
      )}
    >
      <div className="h-1 bg-gradient-to-r from-primary to-primary-light" />
      <div className="p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light">
          <Calendar className="h-6 w-6 text-primary" aria-hidden />
        </div>
        <h3 className="mt-4 text-lg font-bold text-foreground">{BOOKING.label}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-text">
          Choisissez un créneau — confirmation immédiate par email.
        </p>
        <div className="mt-6">
          <BookingLink>
            <Calendar className="h-4 w-4" aria-hidden />
            Choisir un créneau
            <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
          </BookingLink>
        </div>
      </div>
    </div>
  );
}

export function BookAppointment({ className, variant = "card" }: BookAppointmentProps) {
  if (!isBookingConfigured(BOOKING.url, BOOKING.embedUrl)) {
    return null;
  }

  if (variant === "inline") {
    return (
      <BookingLink className={className} inline>
        <Calendar className="h-4 w-4" aria-hidden />
        {BOOKING.label}
        <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
      </BookingLink>
    );
  }

  // card + embed → même carte fiable (plus d’iframe / embed.js Cal)
  return <BookingCard className={className} />;
}
