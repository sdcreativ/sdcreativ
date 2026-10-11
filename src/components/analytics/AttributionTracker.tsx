"use client";

import { useEffect } from "react";
import { mergeAttribution, touchFromVisit, whatsappReference } from "@/lib/attribution";
import { countVisitOnce, getStoredAttribution, saveAttribution, sendMarketingEvent } from "@/lib/attribution-client";

/** Espaces privés : ni provenance ni compteur. */
const PRIVATE = /^\/(admin|espace-client|espace-equipe|espace-prestataire|presentation|c\/|rsvp\/|verifier\/)/;

/**
 * Suivi des sources : provenance de la visite (UTM, clic publicitaire, site d'origine), visite et
 * clics WhatsApp comptés par canal. La référence de campagne est ajoutée au message WhatsApp
 * pré-rempli, pour reconnaître le prospect dans la conversation.
 */
export function AttributionTracker() {
  useEffect(() => {
    if (PRIVATE.test(window.location.pathname)) return;
    const touch = touchFromVisit(window.location.href, document.referrer);
    const attribution = mergeAttribution(getStoredAttribution(), touch);
    saveAttribution(attribution);
    countVisitOnce(touch);

    // Cookies acceptés plus tard dans la visite : la provenance devient persistante.
    const onConsent = () => saveAttribution(getStoredAttribution() ?? attribution);
    window.addEventListener("cookie-consent-change", onConsent);

    const onClick = (event: MouseEvent) => {
      const link = (event.target instanceof Element ? event.target : null)?.closest<HTMLAnchorElement>("a[href]");
      if (!link || !/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(link.href)) return;
      const current = getStoredAttribution();
      sendMarketingEvent({ kind: "whatsapp_click", touch: current?.last ?? null, cta: link.dataset.trackCta });
      const reference = whatsappReference(current);
      if (!reference) return;
      try {
        const url = new URL(link.href);
        const text = url.searchParams.get("text") ?? "";
        if (!text.includes(reference)) {
          url.searchParams.set("text", `${text}${text ? " " : ""}(${reference})`);
          link.href = url.toString();
        }
      } catch {
        /* lien WhatsApp non standard : envoyé tel quel */
      }
    };
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("cookie-consent-change", onConsent);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
