"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { HoneypotField } from "@/components/forms/HoneypotField";
import { TurnstileWidget } from "@/components/forms/TurnstileWidget";
import { useFormTurnstile } from "@/components/forms/useFormTurnstile";
import { newsletterFormCopy, type FormLocale } from "@/i18n/form-copy";

type Status = "idle" | "loading" | "success" | "error";

type Props = {
  locale?: FormLocale;
};

export function NewsletterSignup({ locale = "fr" }: Props) {
  const t = newsletterFormCopy[locale];
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const { turnstileToken, setTurnstileToken, validate, reset, onExpire, required } =
    useFormTurnstile();

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
        body: JSON.stringify({
          email,
          consent,
          _hp: hp,
          turnstileToken: turnstileToken || undefined,
        }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? t.errorFallback);
        setStatus("error");
        return;
      }

      setStatus("success");
      setEmail("");
      reset();
    } catch {
      setError(t.errorNetwork);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-6 flex items-center gap-2 text-sm text-primary-light">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        {t.success}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative mt-6">
      <HoneypotField />
      <p className="mb-3 text-sm font-semibold text-white/90">{t.title}</p>
      <p className="mb-3 text-xs text-white/50">{t.subtitle}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          {t.emailLabel}
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
            placeholder={t.emailPh}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={status === "loading"}
          className="shrink-0 justify-center"
          data-track-cta="newsletter_subscribe"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            t.submit
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
          {t.consentPrefix}{" "}
          <a
            href={t.privacyHref}
            className="font-medium text-primary-light underline underline-offset-2"
          >
            {t.privacyLink}
          </a>
          {t.consentSuffix}
        </span>
      </label>
      {required && (
        <TurnstileWidget
          className="mt-3"
          onToken={setTurnstileToken}
          onExpire={onExpire}
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
