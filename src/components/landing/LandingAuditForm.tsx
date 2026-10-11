"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { HoneypotField } from "@/components/forms/HoneypotField";
import { TurnstileWidget } from "@/components/forms/TurnstileWidget";
import { useFormTurnstile } from "@/components/forms/useFormTurnstile";
import { LandingWhatsappButton } from "@/components/landing/LandingWhatsappButton";
import { trackEvent } from "@/lib/analytics";
import { getStoredAttribution } from "@/lib/attribution-client";

type FormState = "idle" | "loading" | "success" | "error";

const inputClass =
  "w-full rounded-xl border border-[#C9D3E3] bg-white px-4 py-3 text-base text-[#010101] placeholder:text-[#595959]/60 focus:border-[#0175BA] focus:outline-none focus:ring-2 focus:ring-[#0175BA]/20";
const labelClass = "mb-1.5 block text-sm font-semibold text-[#010101]";

/** Formulaire court (4 champs) de la page publicité : rappel sous 24 h ouvrées. */
export function LandingAuditForm() {
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState("");
  const { turnstileToken, setTurnstileToken, validate, reset, onExpire, required } = useFormTurnstile();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const turnstileError = validate();
    if (turnstileError) {
      setError(turnstileError);
      setState("error");
      return;
    }
    setState("loading");
    setError("");
    const data = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/public/landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attribution: getStoredAttribution(),
          firstName: data.get("firstName"),
          whatsapp: data.get("whatsapp"),
          email: data.get("email"),
          company: data.get("company") || undefined,
          website: data.get("website") || undefined,
          _hp: data.get("_hp"),
          turnstileToken: turnstileToken || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Envoi impossible. Réessayez.");
      trackEvent("generate_lead", { form: "landing_audit" });
      setState("success");
    } catch (err) {
      reset();
      setState("error");
      setError(err instanceof Error ? err.message : "Envoi impossible. Réessayez.");
    }
  }

  if (state === "success") {
    return (
      <div className="py-6 text-center" role="status">
        <CheckCircle2 className="mx-auto h-14 w-14 text-[#0175BA]" aria-hidden />
        <p className="mt-4 text-2xl font-extrabold text-[#010101]">Demande reçue !</p>
        <p className="mx-auto mt-2 max-w-sm text-base text-[#595959]">
          Nous analysons votre site et vous recontactons sur WhatsApp sous 24 h ouvrées. Pressé ? Écrivez-nous
          directement.
        </p>
        <LandingWhatsappButton trackId="landing_success_whatsapp" className="mt-6" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative space-y-4" noValidate>
      <HoneypotField />
      <div>
        <label htmlFor="lp-firstName" className={labelClass}>
          Prénom *
        </label>
        <input id="lp-firstName" name="firstName" required autoComplete="given-name" className={inputClass} />
      </div>
      <div>
        <label htmlFor="lp-whatsapp" className={labelClass}>
          Numéro WhatsApp *
        </label>
        <input
          id="lp-whatsapp"
          name="whatsapp"
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          placeholder="+225 07 00 00 00 00"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="lp-email" className={labelClass}>
          E-mail *
        </label>
        <input id="lp-email" name="email" type="email" required autoComplete="email" className={inputClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lp-company" className={labelClass}>
            Entreprise
          </label>
          <input id="lp-company" name="company" autoComplete="organization" className={inputClass} />
        </div>
        <div>
          <label htmlFor="lp-website" className={labelClass}>
            Site actuel
          </label>
          <input
            id="lp-website"
            name="website"
            autoComplete="url"
            placeholder="www.exemple.com"
            className={inputClass}
          />
        </div>
      </div>
      {required && <TurnstileWidget onToken={setTurnstileToken} onExpire={onExpire} />}
      {state === "error" && error && (
        <p className="text-sm font-medium text-[#E23944]" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={state === "loading"}
        data-track-cta="landing_form_submit"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E23944] px-5 py-4 text-lg font-bold text-white shadow-lg shadow-[#E23944]/25 transition-colors hover:bg-[#C92F3A] disabled:opacity-60"
      >
        {state === "loading" && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
        Recevoir mon audit gratuit
      </button>
      <p className="text-center text-xs text-[#595959]">Gratuit et sans engagement. Vos données restent chez nous.</p>
    </form>
  );
}
