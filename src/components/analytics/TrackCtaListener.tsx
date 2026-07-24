"use client";

import { useEffect } from "react";
import { trackCta } from "@/lib/analytics";

/** Écoute les clics sur `[data-track-cta]` (devis, audit, RDV, WhatsApp, chat…). */
export function TrackCtaListener() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const el = target.closest<HTMLElement>("[data-track-cta]");
      if (!el) return;
      const ctaId = el.getAttribute("data-track-cta")?.trim();
      if (!ctaId) return;
      const href = el.getAttribute("href");
      trackCta(ctaId, {
        ...(href ? { href } : {}),
        path: window.location.pathname,
      });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
