"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Check, Copy, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { HoneypotField } from "@/components/forms/HoneypotField";
import { TurnstileWidget } from "@/components/forms/TurnstileWidget";
import { useFormTurnstile } from "@/components/forms/useFormTurnstile";
import { getCookieConsent } from "@/components/layout/CookieConsent";
import { SitePopupCard } from "@/components/popups/SitePopupCard";
import { isActiveEnglishPath } from "@/i18n/routes";
import {
  POPUP_FORBIDDEN_PREFIXES,
  POPUP_PROJECT_TYPES,
  popupAllowedByFrequency,
  popupMatchesAudience,
  type PublicSitePopup,
} from "@/lib/site-popups-types";
import { cn } from "@/lib/utils";

/* ── Stockage local (confort par visiteur ; tout est protégé : le popup marche sans) ── */
type PopupState = { lastShownAt?: number; signedUp?: boolean };
const stateKey = (id: string) => `sdcreativ-popup-${id}`;
const VISITS_KEY = "sdcreativ-visits";

function readState(id: string): PopupState | null {
  try {
    const raw = localStorage.getItem(stateKey(id));
    return raw ? (JSON.parse(raw) as PopupState) : null;
  } catch {
    return null;
  }
}

function writeState(id: string, patch: PopupState) {
  try {
    localStorage.setItem(stateKey(id), JSON.stringify({ ...readState(id), ...patch }));
  } catch {
    /* stockage indisponible : le popup pourra réapparaître, sans gravité */
  }
}

const BUCKET_KEY = "sdcreativ-popup-bucket";

/** Seau A/B du visiteur (0-99), tiré une fois puis mémorisé : il voit toujours la même version. */
function visitorBucket(): number {
  try {
    const raw = localStorage.getItem(BUCKET_KEY);
    const stored = raw === null ? Number.NaN : Number(raw);
    if (Number.isInteger(stored) && stored >= 0 && stored < 100) return stored;
    const bucket = Math.floor(Math.random() * 100);
    localStorage.setItem(BUCKET_KEY, String(bucket));
    return bucket;
  } catch {
    return 0;
  }
}

/** Nombre de visites (une par session de navigation). */
function countVisit(): number {
  try {
    let visits = Number(localStorage.getItem(VISITS_KEY) ?? "0") || 0;
    if (!sessionStorage.getItem(VISITS_KEY)) {
      visits += 1;
      localStorage.setItem(VISITS_KEY, String(visits));
      sessionStorage.setItem(VISITS_KEY, "1");
    }
    return visits;
  } catch {
    return 1;
  }
}

function sendEvent(id: string, type: "impression" | "close") {
  void fetch(`/api/public/popup/${id}/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
    keepalive: true,
  }).catch(() => undefined);
}

function subscribeConsent(onChange: () => void) {
  window.addEventListener("cookie-consent-change", onChange);
  return () => window.removeEventListener("cookie-consent-change", onChange);
}

const COPY = {
  fr: {
    close: "Fermer",
    name: "Prénom",
    email: "E-mail",
    phone: "WhatsApp (facultatif)",
    project: "Votre projet (facultatif)",
    next: "Continuer",
    back: "Retour",
    yourCode: "Votre code personnel",
    validUntil: "Valable jusqu'au",
    copy: "Copier",
    copied: "Copié",
    useCode: "Utiliser mon code",
    whatsapp: "Écrire sur WhatsApp",
    error: "Une erreur est survenue. Réessayez.",
  },
  en: {
    close: "Close",
    name: "First name",
    email: "Email",
    phone: "WhatsApp (optional)",
    project: "Your project (optional)",
    next: "Continue",
    back: "Back",
    yourCode: "Your personal code",
    validUntil: "Valid until",
    copy: "Copy",
    copied: "Copied",
    useCode: "Use my code",
    whatsapp: "Message us on WhatsApp",
    error: "Something went wrong. Please try again.",
  },
} as const;

const inputClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type Result = { code: string; expiresAt: string; devisUrl: string; whatsappUrl: string };

/**
 * Popup de capture (façon Mailchimp) : déclencheurs délai / défilement / intention de sortie,
 * fréquence, audience, panneau bas de page sur mobile (pas d'interstitiel plein écran),
 * formulaire en deux étapes, code personnel. Attend la décision cookies pour ne pas s'y superposer.
 */
export function SitePopup() {
  const pathname = usePathname() ?? "/";
  const locale = isActiveEnglishPath(pathname) ? "en" : "fr";
  const t = COPY[locale];
  const forbidden = POPUP_FORBIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  const consentDecided = useSyncExternalStore(subscribeConsent, () => getCookieConsent() !== null, () => false);

  const [popup, setPopup] = useState<PublicSitePopup | null>(null);
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ name: "", email: "", phone: "", projectType: "", consent: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const shownRef = useRef(false);
  const { turnstileToken, setTurnstileToken, validate, reset, onExpire, required } = useFormTurnstile();

  // 1. Chargement du popup actif pour la page (après la décision cookies).
  useEffect(() => {
    if (forbidden || !consentDecided) return;
    let cancelled = false;
    shownRef.current = false;
    fetch(`/api/public/popup?path=${encodeURIComponent(pathname)}&locale=${locale}&v=${visitorBucket()}`)
      .then((r) => (r.ok ? r.json() : { popup: null }))
      .then((json: { popup: PublicSitePopup | null }) => {
        if (!cancelled) setPopup(json.popup);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pathname, locale, forbidden, consentDecided]);

  const show = useCallback(() => {
    if (!popup || shownRef.current) return;
    shownRef.current = true;
    previousFocus.current = document.activeElement as HTMLElement | null;
    writeState(popup.id, { lastShownAt: Date.now() });
    sendEvent(popup.id, "impression");
    setOpen(true);
  }, [popup]);

  // 2. Déclencheurs, une fois le popup chargé et autorisé (audience, fréquence, appareil).
  useEffect(() => {
    if (!popup) return;
    const isMobile =
      window.matchMedia("(max-width: 640px)").matches || !window.matchMedia("(pointer: fine)").matches;
    setMobile(isMobile);
    if (isMobile && !popup.showOnMobile) return;
    if (!popupMatchesAudience(popup.audience, countVisit())) return;
    if (!popupAllowedByFrequency(readState(popup.id), popup.frequencyDays)) return;

    const cleanups: Array<() => void> = [];
    if (popup.triggerDelaySeconds != null) {
      const timer = window.setTimeout(show, popup.triggerDelaySeconds * 1000);
      cleanups.push(() => window.clearTimeout(timer));
    }
    if (popup.triggerScrollPercent != null) {
      const target = popup.triggerScrollPercent;
      const onScroll = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (max > 0 && (window.scrollY / max) * 100 >= target) show();
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanups.push(() => window.removeEventListener("scroll", onScroll));
    }
    // Intention de sortie : ordinateur uniquement (la souris quitte la fenêtre par le haut).
    if (popup.triggerExitIntent && !isMobile) {
      const onOut = (e: MouseEvent) => {
        if (!e.relatedTarget && e.clientY <= 0) show();
      };
      document.addEventListener("mouseout", onOut);
      cleanups.push(() => document.removeEventListener("mouseout", onOut));
    }
    return () => cleanups.forEach((fn) => fn());
  }, [popup, show]);

  const close = useCallback(() => {
    if (!popup) return;
    setOpen(false);
    if (!result) sendEvent(popup.id, "close");
    previousFocus.current?.focus?.();
  }, [popup, result]);

  // 3. Accessibilité : focus initial, Échap, piège de focus pour la fenêtre modale.
  useEffect(() => {
    if (!open) return;
    const root = dialogRef.current;
    root?.querySelector<HTMLElement>("input, button:not([aria-label])")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key !== "Tab" || !root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, step, result, close]);

  if (!popup || !open) return null;

  const hasStep2 = popup.askPhone || popup.askProject;
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((p) => ({ ...p, [key]: value }));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!popup) return;
    if (step === 1 && hasStep2) {
      setStep(2);
      return;
    }
    const turnstileError = validate();
    if (turnstileError) {
      setError(turnstileError);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/public/popup/${popup.id}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          projectType: form.projectType || undefined,
          consent: form.consent,
          pagePath: pathname,
          _hp: new FormData(e.currentTarget).get("_hp"),
          turnstileToken: turnstileToken || undefined,
        }),
      });
      const json = (await res.json()) as Result & { error?: string };
      if (!res.ok) throw new Error(json.error ?? t.error);
      setResult(json);
      writeState(popup.id, { signedUp: true });
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* copie refusée : le code reste affiché et envoyé par e-mail */
    }
  }

  const modal = popup.layout === "modal" && !mobile;
  const titleId = `site-popup-title-${popup.id}`;
  const expires = result
    ? new Date(result.expiresAt).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "";

  const content = (
    <SitePopupCard
      popup={popup}
      heading={result ? { title: popup.successTitle, body: popup.successBody } : undefined}
      onClose={close}
      closeLabel={t.close}
      titleId={titleId}
      className={mobile ? "rounded-b-none" : undefined}
    >
      {result ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-primary/40 bg-primary-light p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">{t.yourCode}</p>
            <p className="mt-1 font-mono text-2xl font-extrabold tracking-widest text-foreground">{result.code}</p>
            <p className="mt-1 text-xs text-gray-text">
              {popup.offerLabel} · {t.validUntil} {expires}
            </p>
            <button
              type="button"
              onClick={() => void copyCode()}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-white"
            >
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
              {copied ? t.copied : t.copy}
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button href={result.devisUrl} variant={popup.variant === "accent" ? "accent" : "primary"} className="flex-1 justify-center">
              {t.useCode}
            </Button>
            {result.whatsappUrl && (
              <Button href={result.whatsappUrl} variant="whatsappLight" className="flex-1 justify-center">
                <MessageCircle className="h-4 w-4" aria-hidden />
                {t.whatsapp}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => void submit(e)} className="relative space-y-3" noValidate={false}>
          <HoneypotField />
          {step === 1 ? (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-text">{t.name}</span>
                <input required minLength={2} maxLength={120} autoComplete="given-name" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-text">{t.email}</span>
                <input required type="email" maxLength={255} autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
              </label>
            </>
          ) : (
            <>
              {popup.askPhone && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-text">{t.phone}</span>
                  <input type="tel" maxLength={40} autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} placeholder="+225 07 00 00 00 00" />
                </label>
              )}
              {popup.askProject && (
                <fieldset>
                  <legend className="mb-1 block text-xs font-medium text-gray-text">{t.project}</legend>
                  <div className="flex flex-wrap gap-2">
                    {POPUP_PROJECT_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={form.projectType === type}
                        onClick={() => set("projectType", form.projectType === type ? "" : type)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium",
                          form.projectType === type ? "border-primary bg-primary text-white" : "border-gray/60 bg-white text-foreground hover:bg-gray-light",
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
            </>
          )}
          {(step === 2 || !hasStep2) && (
            <>
              <label className="flex items-start gap-2 text-xs leading-relaxed text-gray-text">
                <input type="checkbox" required checked={form.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 rounded border-gray/60 text-primary" />
                {popup.consentText}
              </label>
              {required && <TurnstileWidget onToken={setTurnstileToken} onExpire={onExpire} />}
            </>
          )}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            {step === 2 && (
              <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-gray/60 px-4 py-2.5 text-sm font-medium hover:bg-gray-light">
                {t.back}
              </button>
            )}
            <Button type="submit" disabled={loading} variant={popup.variant === "accent" ? "accent" : "primary"} className="flex-1 justify-center">
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {step === 1 && hasStep2 ? t.next : popup.ctaLabel}
            </Button>
          </div>
        </form>
      )}
    </SitePopupCard>
  );

  if (mobile) {
    // Panneau bas de page (pas d'interstitiel plein écran, pénalisé par Google sur mobile).
    return (
      <div ref={dialogRef} role="dialog" aria-modal="false" aria-labelledby={titleId} className="fixed inset-x-0 bottom-0 z-[60] max-h-[85vh] overflow-y-auto">
        {content}
      </div>
    );
  }

  if (modal) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && close()}>
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md">
          {content}
        </div>
      </div>
    );
  }

  // Encart latéral, en bas à gauche (les boutons flottants chat / WhatsApp sont à droite).
  return (
    <div ref={dialogRef} role="dialog" aria-modal="false" aria-labelledby={titleId} className="fixed bottom-6 left-6 z-[60] w-[380px] max-w-[calc(100vw-3rem)]">
      {content}
    </div>
  );
}
