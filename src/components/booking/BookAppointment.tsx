"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BOOKING } from "@/lib/constants";
import { getCalLinkFromBookingUrl, isBookingConfigured } from "@/lib/booking";
import { cn } from "@/lib/utils";

type BookAppointmentProps = {
  className?: string;
  variant?: "card" | "inline" | "embed";
};

type CalApi = ((...args: unknown[]) => void) & {
  loaded?: boolean;
  ns?: Record<string, CalApi>;
  q?: unknown[];
};

declare global {
  interface Window {
    Cal?: CalApi;
  }
}

function initCalSnippet() {
  if (typeof window === "undefined" || typeof window.Cal === "function") return;

  const w = window;
  const scriptSrc = "https://app.cal.com/embed/embed.js";

  const Cal = function (...args: unknown[]) {
    const cal = Cal as CalApi;
    if (!cal.loaded) {
      cal.ns = {};
      cal.q = cal.q || [];
      const script = w.document.createElement("script");
      script.src = scriptSrc;
      script.async = true;
      w.document.head.appendChild(script);
      cal.loaded = true;
    }
    if (args[0] === "init") {
      const api = function (...apiArgs: unknown[]) {
        (api.q = api.q || []).push(apiArgs);
      } as CalApi;
      api.q = [];
      const namespace = args[1];
      if (typeof namespace === "string") {
        cal.ns = cal.ns || {};
        cal.ns[namespace] = cal.ns[namespace] || api;
        (cal.ns[namespace].q = cal.ns[namespace].q || []).push(args);
        (cal.q = cal.q || []).push(["initNamespace", namespace]);
      } else {
        (cal.q = cal.q || []).push(args);
      }
      return;
    }
    (cal.q = cal.q || []).push(args);
  } as CalApi;

  Cal.q = [];
  w.Cal = Cal;
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
        <Button href={href} external newTab={false} className="mt-6 w-full justify-center">
          Choisir un créneau
          <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

/**
 * Tentative d’embed Cal.com ; en cas d’échec → carte + bouton (jamais d’iframe cassée).
 */
function CalInlineEmbed({ className }: { className?: string }) {
  const reactId = useId().replace(/:/g, "");
  const containerId = `cal-embed-${reactId}`;
  const mounted = useRef(false);
  const [failed, setFailed] = useState(false);
  const calLink = BOOKING.url ? getCalLinkFromBookingUrl(BOOKING.url) : null;

  useEffect(() => {
    if (!calLink) {
      setFailed(true);
      return;
    }
    if (mounted.current) return;
    mounted.current = true;

    try {
      initCalSnippet();
      if (!window.Cal) {
        setFailed(true);
        return;
      }
      window.Cal("init", { origin: "https://cal.com" });
      window.Cal("inline", {
        elementOrSelector: `#${containerId}`,
        calLink,
        config: { layout: "month_view", theme: "light" },
      });

      const timer = window.setTimeout(() => {
        const el = document.getElementById(containerId);
        if (el && el.childElementCount === 0) setFailed(true);
      }, 3000);
      return () => window.clearTimeout(timer);
    } catch {
      setFailed(true);
    }
  }, [calLink, containerId]);

  if (failed || !calLink) {
    return <BookingCard className={className} />;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-gray/60 bg-white shadow-sm",
        className,
      )}
    >
      <div className="border-b border-gray/60 bg-primary-light/50 px-6 py-4">
        <h3 className="flex items-center gap-2 font-bold text-foreground">
          <Calendar className="h-5 w-5 text-primary" aria-hidden />
          {BOOKING.label}
        </h3>
        <p className="mt-1 text-sm text-gray-text">
          Choisissez un créneau disponible — confirmation immédiate par email.
        </p>
      </div>
      <div id={containerId} className="min-h-[580px] w-full" />
      {BOOKING.url && (
        <div className="border-t border-gray/40 px-6 py-3 text-center">
          <a
            href={BOOKING.url}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Ouvrir le calendrier Cal.com
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      )}
    </div>
  );
}

export function BookAppointment({ className, variant = "card" }: BookAppointmentProps) {
  if (!isBookingConfigured(BOOKING.url, BOOKING.embedUrl)) {
    return null;
  }

  if (variant === "embed") {
    return <CalInlineEmbed className={className} />;
  }

  if (variant === "inline") {
    return (
      <Button
        href={BOOKING.url || BOOKING.embedUrl}
        external
        newTab={false}
        size="lg"
        className={className}
      >
        <Calendar className="h-4 w-4" aria-hidden />
        {BOOKING.label}
        <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
      </Button>
    );
  }

  return <BookingCard className={className} />;
}
