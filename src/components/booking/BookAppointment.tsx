"use client";

import { usePathname } from "next/navigation";
import { Calendar, ArrowRight } from "lucide-react";
import { BOOKING } from "@/lib/constants";
import {
  buildBookingEmbedUrl,
  buildBookingPublicUrl,
  isBookingConfigured,
} from "@/lib/booking";
import { cn } from "@/lib/utils";
import { isActiveEnglishPath } from "@/i18n/routes";

type BookAppointmentProps = {
  className?: string;
  /**
   * card — CTA vers /rendez-vous
   * inline — bouton compact
   * embed — calendrier Cal.com clair intégré
   */
  variant?: "card" | "inline" | "embed";
};

function useBookingLocale() {
  const pathname = usePathname() || "";
  return isActiveEnglishPath(pathname) ? ("en" as const) : ("fr" as const);
}

function BookingCtaLink({
  className,
  children,
  inline,
  href,
}: {
  className?: string;
  children: React.ReactNode;
  inline?: boolean;
  href: string;
}) {
  return (
    <a
      href={href}
      className={
        inline
          ? cn(
              "inline-flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-white px-8 py-3.5 text-base font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary-light",
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

function BookingCard({
  className,
  href,
  locale,
}: {
  className?: string;
  href: string;
  locale: "fr" | "en";
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-gray/50 bg-white shadow-sm",
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
          {locale === "en"
            ? "Clear calendar, live slots — instant email confirmation."
            : "Calendrier clair, créneaux en direct — confirmation immédiate par email."}
        </p>
        <div className="mt-6">
          <BookingCtaLink href={href}>
            {locale === "en" ? "Choose a time" : "Choisir un créneau"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </BookingCtaLink>
        </div>
      </div>
    </div>
  );
}

function BookingEmbed({
  className,
  locale,
}: {
  className?: string;
  locale: "fr" | "en";
}) {
  const source = BOOKING.url || BOOKING.embedUrl;
  if (!source) return null;

  const embedSrc = buildBookingEmbedUrl(source, BOOKING.embedUrl || undefined);
  const publicUrl = buildBookingPublicUrl(source);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.75rem] border border-gray/40 bg-white shadow-[0_20px_60px_-28px_rgba(0,114,181,0.35)]",
        className,
      )}
    >
      <div className="border-b border-gray/30 bg-gradient-to-b from-primary-light/80 to-white px-6 py-6 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {locale === "en" ? "Book a meeting" : "Prise de rendez-vous"}
        </p>
        <h3 className="mt-2 text-xl font-bold text-foreground md:text-2xl">
          {BOOKING.label}
        </h3>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-text">
          {locale === "en"
            ? "Pick a date and time. You’ll get an email confirmation with the video call link."
            : "Sélectionnez une date et un horaire. Vous recevrez une confirmation par email avec le lien de visioconférence."}
        </p>
      </div>

      <div className="bg-white px-2 pb-2 md:px-4 md:pb-4">
        <iframe
          src={embedSrc}
          title={BOOKING.label}
          loading="lazy"
          className="w-full rounded-2xl bg-white"
          style={{ minHeight: 720, border: 0 }}
          allow="camera; microphone; fullscreen"
        />
      </div>

      <div className="border-t border-gray/30 px-6 py-4 text-center md:px-8">
        <a
          href={publicUrl}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {locale === "en"
            ? "Open the calendar full page"
            : "Ouvrir le calendrier en pleine page"}
        </a>
      </div>
    </div>
  );
}

export function BookAppointment({ className, variant = "card" }: BookAppointmentProps) {
  const locale = useBookingLocale();
  const pageHref = locale === "en" ? "/en/book" : "/rendez-vous";

  if (!isBookingConfigured(BOOKING.url, BOOKING.embedUrl)) {
    return null;
  }

  if (variant === "inline") {
    return (
      <BookingCtaLink className={className} inline href={pageHref}>
        <Calendar className="h-4 w-4" aria-hidden />
        {BOOKING.label}
      </BookingCtaLink>
    );
  }

  if (variant === "embed") {
    return <BookingEmbed className={className} locale={locale} />;
  }

  return <BookingCard className={className} href={pageHref} locale={locale} />;
}
