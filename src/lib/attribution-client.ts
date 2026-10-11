"use client";

import { getCookieConsent } from "@/components/layout/CookieConsent";
import { attributionSchema, type Attribution, type AttributionTouch } from "@/lib/attribution";

/**
 * Provenance du visiteur dans son navigateur. Conservée 90 jours seulement si les cookies sont
 * acceptés (localStorage) ; sinon limitée à la visite en cours (sessionStorage).
 */
const KEY = "sdcreativ-attribution";
const SESSION_VISIT_KEY = "sdcreativ-visit-counted";
const MAX_AGE_MS = 90 * 86_400_000;

type Stored = Attribution & { savedAt: number };

function read(storage: Storage | undefined): Attribution | null {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    const valid = attributionSchema.safeParse({ first: parsed.first, last: parsed.last });
    return valid.success ? valid.data : null;
  } catch {
    return null;
  }
}

function persistentAllowed(): boolean {
  try {
    return getCookieConsent() === "accepted";
  } catch {
    return false;
  }
}

export function getStoredAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  return read(persistentAllowed() ? window.localStorage : undefined) ?? read(window.sessionStorage);
}

export function saveAttribution(attribution: Attribution): void {
  if (typeof window === "undefined") return;
  const value = JSON.stringify({ ...attribution, savedAt: Date.now() } satisfies Stored);
  try {
    window.sessionStorage.setItem(KEY, value);
    if (persistentAllowed()) window.localStorage.setItem(KEY, value);
  } catch {
    /* stockage indisponible (navigation privée stricte) : provenance perdue, sans gravité */
  }
}

/** Compteur anonyme (visite, clic WhatsApp) : ni IP ni identifiant, juste canal et campagne. */
export function sendMarketingEvent(event: {
  kind: "visit" | "whatsapp_click";
  touch?: AttributionTouch | null;
  cta?: string;
}): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    kind: event.kind,
    channel: event.touch?.channel ?? "direct",
    campaign: event.touch?.campaign,
    path: window.location.pathname.slice(0, 300),
    cta: event.cta?.slice(0, 60),
  });
  try {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/public/track", blob)) return;
  } catch {
    /* repli fetch ci-dessous */
  }
  void fetch("/api/public/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(
    () => undefined,
  );
}

/** Une visite comptée par session de navigation. */
export function countVisitOnce(touch: AttributionTouch): void {
  try {
    if (window.sessionStorage.getItem(SESSION_VISIT_KEY)) return;
    window.sessionStorage.setItem(SESSION_VISIT_KEY, "1");
  } catch {
    return;
  }
  sendMarketingEvent({ kind: "visit", touch });
}
