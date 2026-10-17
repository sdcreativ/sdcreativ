"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { HoneypotField } from "@/components/forms/HoneypotField";
import { TurnstileWidget } from "@/components/forms/TurnstileWidget";
import { useFormTurnstile } from "@/components/forms/useFormTurnstile";
import { trackEvent } from "@/lib/analytics";

const COPY = {
  fr: {
    title: "Un conseiller vous recontacte ?",
    body: "Laissez vos coordonnées : nous reprenons votre demande sur WhatsApp, sans que vous ayez à tout réexpliquer.",
    firstName: "Prénom",
    whatsapp: "WhatsApp",
    email: "E-mail",
    submit: "Être recontacté",
    later: "Plus tard",
    fallback: "Envoi impossible. Réessayez ou écrivez-nous sur WhatsApp.",
  },
  en: {
    title: "Shall an advisor get back to you?",
    body: "Leave your details: we pick up your request on WhatsApp, no need to explain everything again.",
    firstName: "First name",
    whatsapp: "WhatsApp",
    email: "Email",
    submit: "Get a call back",
    later: "Later",
    fallback: "Could not send. Please try again or message us on WhatsApp.",
  },
} as const;

/**
 * Carte « un conseiller vous recontacte » affichée dans la conversation avec Nari : crée un prospect
 * au CRM avec la conversation (questions posées, provenance) et prévient l'équipe.
 */
export function ChatContactCard({
  conversationId,
  locale,
  onSent,
  onDismiss,
}: {
  conversationId: string;
  locale: "fr" | "en";
  onSent: (firstName: string, email: string) => void;
  onDismiss: () => void;
}) {
  const t = COPY[locale];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { turnstileToken, setTurnstileToken, validate, reset, onExpire, required } = useFormTurnstile();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const turnstileError = validate();
    if (turnstileError) {
      setError(turnstileError);
      return;
    }
    const data = new FormData(e.currentTarget);
    const firstName = String(data.get("firstName") ?? "").trim();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chat/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          firstName,
          whatsapp: data.get("whatsapp"),
          email: data.get("email"),
          _hp: data.get("_hp"),
          turnstileToken: turnstileToken || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? t.fallback);
      trackEvent("generate_lead", { form: "kady_chat" });
      onSent(firstName, String(data.get("email") ?? "").trim());
    } catch (err) {
      reset();
      setError(err instanceof Error ? err.message : t.fallback);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray/60 bg-white px-3 py-2 text-[0.95em] text-foreground focus:border-[var(--kady-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--kady-accent)]/20";

  return (
    <form
      onSubmit={handleSubmit}
      className="relative space-y-2 rounded-2xl border border-[var(--kady-accent)]/40 bg-white p-3 text-foreground shadow-sm"
      aria-label={t.title}
    >
      <HoneypotField />
      <p className="text-[0.95em] font-semibold">{t.title}</p>
      <p className="text-[0.85em] text-gray-text">{t.body}</p>
      <input name="firstName" required minLength={2} maxLength={80} autoComplete="given-name" placeholder={t.firstName} aria-label={t.firstName} className={inputClass} />
      <input name="whatsapp" type="tel" required inputMode="tel" autoComplete="tel" placeholder={`${t.whatsapp} (+225…)`} aria-label={t.whatsapp} className={inputClass} />
      <input name="email" type="email" required autoComplete="email" placeholder={t.email} aria-label={t.email} className={inputClass} />
      {required && <TurnstileWidget onToken={setTurnstileToken} onExpire={onExpire} />}
      {error && (
        <p className="text-[0.85em] text-accent" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--kady-accent)] px-3 py-2 text-[0.9em] font-semibold text-[var(--kady-accent-text)] hover:opacity-90 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {t.submit}
        </button>
        <button type="button" onClick={onDismiss} className="rounded-lg px-3 py-2 text-[0.85em] text-gray-text hover:bg-gray-light">
          {t.later}
        </button>
      </div>
    </form>
  );
}
