"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { HoneypotField } from "@/components/forms/HoneypotField";
import { TurnstileWidget } from "@/components/forms/TurnstileWidget";
import { useFormTurnstile } from "@/components/forms/useFormTurnstile";

type Status = "idle" | "loading" | "success" | "error";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const { turnstileToken, setTurnstileToken, validate, reset, required } = useFormTurnstile();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    const turnstileError = validate();
    if (turnstileError) {
      setError(turnstileError);
      setStatus("error");
      return;
    }

    const hp = new FormData(e.currentTarget).get("_hp");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent, _hp: hp, turnstileToken: turnstileToken || undefined }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        setStatus("error");
        return;
      }

      setStatus("success");
      setEmail("");
      reset();
    } catch {
      setError("Impossible de s'inscrire. Réessayez plus tard.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-6 flex items-center gap-2 text-sm text-primary-light">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        Merci ! Vous êtes inscrit à notre newsletter.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative mt-6">
      <HoneypotField />
      <p className="mb-3 text-sm font-semibold text-white/90">Newsletter</p>
      <p className="mb-3 text-xs text-white/50">
        Conseils web, actualités et offres exclusives.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Adresse email
        </label>
        <div className="relative flex-1">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            aria-hidden
          />
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={status === "loading"}
          className="shrink-0 justify-center"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            "S'inscrire"
          )}
        </Button>
      </div>
      <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-white/55">
        <input
          type="checkbox"
          name="consent"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-white/20 accent-primary"
        />
        <span>
          J&apos;accepte de recevoir la newsletter et j&apos;ai lu la{" "}
          <a
            href="/politique-confidentialite"
            className="font-medium text-primary-light underline underline-offset-2"
          >
            politique de confidentialité
          </a>
          . Désinscription possible à tout moment.
        </span>
      </label>
      {required && (
        <TurnstileWidget
          className="mt-3"
          onToken={setTurnstileToken}
          onExpire={() => setTurnstileToken("")}
        />
      )}
      {error && (
        <p className="mt-2 text-xs text-accent" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
