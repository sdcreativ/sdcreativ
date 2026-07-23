"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calculator,
  CheckCircle,
  Loader2,
  Send,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { HoneypotField } from "@/components/forms/HoneypotField";
import { TurnstileWidget } from "@/components/forms/TurnstileWidget";
import { useFormTurnstile } from "@/components/forms/useFormTurnstile";
import {
  budgetOptions,
  timelineOptions,
} from "@/content/contact-options";
import {
  budgetOptionsEn,
  quoteFormCopy,
  timelineOptionsEn,
  type FormLocale,
} from "@/i18n/form-copy";
import type { SiteQuoteConfigSettings } from "@/lib/site-quote-config-types";
import type { PresentationContext } from "@/lib/presentation-types";
import {
  calculateQuote,
  getAvailableAddons,
  getProjectType,
} from "@/lib/quote-calculator";
import { cn } from "@/lib/utils";

type FormState = "idle" | "loading" | "success" | "error";

const fieldClass =
  "w-full rounded-xl border border-gray/80 bg-white px-4 py-3.5 text-sm text-foreground shadow-sm transition-all placeholder:text-gray-text/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";

type PresentationMetaInput = Omit<
  PresentationContext,
  "validatedAt" | "clientValidatedOrally"
>;

type Props = {
  config: SiteQuoteConfigSettings;
  variant?: "public" | "presentation";
  presentationMeta?: PresentationMetaInput;
  onPresentationSuccess?: (leadId: string | null) => void;
  locale?: FormLocale;
};

export function QuoteConfigurator({
  config,
  variant = "public",
  presentationMeta,
  onPresentationSuccess,
  locale = "fr",
}: Props) {
  const t = quoteFormCopy[locale];
  const budgetOpts = locale === "en" ? budgetOptionsEn : budgetOptions;
  const timelineOpts = locale === "en" ? timelineOptionsEn : timelineOptions;
  const searchParams = useSearchParams();
  const [projectTypeId, setProjectTypeId] = useState(config.projectTypes[0]?.id ?? "");
  const [pageTierId, setPageTierId] = useState(config.pageTiers[0]?.id ?? "1-5");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [clientValidatedOrally, setClientValidatedOrally] = useState(false);
  const isPresentation = variant === "presentation";
  const { turnstileToken, setTurnstileToken, validate, reset, onExpire, required } = useFormTurnstile({
    skip: isPresentation,
  });

  useEffect(() => {
    const type = searchParams.get("type");
    if (type && config.projectTypes.some((t) => t.id === type)) {
      setProjectTypeId(type);
    }
  }, [searchParams, config.projectTypes]);

  const calculatorConfig = useMemo(
    () => ({
      projectTypes: config.projectTypes,
      pageTiers: config.pageTiers,
      addons: config.addons,
      estimateNote: config.estimateNote,
    }),
    [config],
  );

  const project = getProjectType(projectTypeId, calculatorConfig);
  const availableAddons = useMemo(
    () => getAvailableAddons(projectTypeId, calculatorConfig),
    [projectTypeId, calculatorConfig],
  );

  const quote = useMemo(
    () =>
      calculateQuote(
        {
          projectTypeId,
          pageTierId: project?.supportsPages ? pageTierId : undefined,
          addonIds,
        },
        calculatorConfig,
      ),
    [projectTypeId, pageTierId, addonIds, project?.supportsPages, calculatorConfig],
  );

  function toggleAddon(id: string) {
    setAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setErrorMessage("");

    const turnstileError = validate();
    if (turnstileError) {
      setErrorMessage(turnstileError);
      setState("error");
      return;
    }

    const form = e.currentTarget;
    const data = new FormData(form);

    const payload = {
      name: data.get("name"),
      email: data.get("email"),
      phone: data.get("phone"),
      company: data.get("company"),
      projectTypeId,
      pageTierId: project?.supportsPages ? pageTierId : undefined,
      addonIds,
      budget: data.get("budget"),
      timeline: data.get("timeline"),
      message: data.get("message"),
      _hp: data.get("_hp"),
      turnstileToken: turnstileToken || undefined,
    };

    if (isPresentation) {
      if (!presentationMeta) {
        setErrorMessage("Session présentation invalide.");
        setState("error");
        return;
      }
      if (!clientValidatedOrally) {
        setErrorMessage("Confirmez que le client a validé ce brief oralement.");
        setState("error");
        return;
      }

      try {
        const res = await fetch("/api/presentation/devis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            presentation: {
              ...presentationMeta,
              validatedAt: new Date().toISOString(),
              clientValidatedOrally: true,
            },
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? t.errorFallback);

        if (onPresentationSuccess) {
          onPresentationSuccess(json.leadId ?? null);
          return;
        }

        setState("success");
        form.reset();
        setAddonIds([]);
        setClientValidatedOrally(false);
      } catch (err) {
        setState("error");
        setErrorMessage(err instanceof Error ? err.message : t.errorFallback);
      }
      return;
    }

    try {
      const res = await fetch("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t.errorFallback);

      setState("success");
      form.reset();
      setAddonIds([]);
      reset();
    } catch (err) {
      setState("error");
      setErrorMessage(err instanceof Error ? err.message : t.errorFallback);
    }
  }

  if (state === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary-light via-white to-white p-10 text-center shadow-lg"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg">
          <CheckCircle className="h-8 w-8 text-white" aria-hidden />
        </div>
        <h3 className="mt-6 text-2xl font-bold text-foreground">{t.successTitle}</h3>
        <p className="mx-auto mt-3 max-w-md text-gray-text">{t.successBody}</p>
        <Button type="button" variant="ghost" className="mt-8" onClick={() => setState("idle")}>
          {t.successAgain}
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
      <form
        onSubmit={handleSubmit}
        className="relative space-y-8 rounded-3xl border border-gray/60 bg-white p-8 shadow-sm md:p-10"
      >
        <HoneypotField />
        <div>
          <h2 className="text-xl font-bold text-foreground md:text-2xl">
            {isPresentation ? "Brief projet client" : config.formTitle}
          </h2>
          <p className="mt-2 text-sm text-gray-text">
            {isPresentation
              ? "Complétez le configurateur avec le client, puis validez le brief pour l'enregistrer au CRM."
              : config.formSubtitle}
          </p>
        </div>

        <div>
          <label htmlFor="projectType" className="mb-2 block text-sm font-semibold text-foreground">
            {t.projectType} <span className="text-accent">*</span>
          </label>
          <div className="relative">
            <select
              id="projectType"
              value={projectTypeId}
              onChange={(e) => {
                setProjectTypeId(e.target.value);
                setAddonIds([]);
              }}
              className={cn(fieldClass, "cursor-pointer appearance-none pr-10")}
            >
              {config.projectTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text" aria-hidden />
          </div>
        </div>

        {project?.supportsPages && (
          <div>
            <label htmlFor="pageTier" className="mb-2 block text-sm font-semibold text-foreground">
              {t.pages}
            </label>
            <div className="relative">
              <select
                id="pageTier"
                value={pageTierId}
                onChange={(e) => setPageTierId(e.target.value)}
                className={cn(fieldClass, "cursor-pointer appearance-none pr-10")}
              >
                {config.pageTiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text" aria-hidden />
            </div>
          </div>
        )}

        {availableAddons.length > 0 && (
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-foreground">
              {t.addons}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {availableAddons.map((addon) => (
                <label
                  key={addon.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-colors",
                    addonIds.includes(addon.id)
                      ? "border-primary bg-primary-light/40"
                      : "border-gray/60 hover:border-primary/30",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={addonIds.includes(addon.id)}
                    onChange={() => toggleAddon(addon.id)}
                    className="mt-0.5 accent-primary"
                  />
                  <span className="font-medium text-foreground">{addon.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="border-t border-gray/60 pt-8">
          <h3 className="mb-4 font-bold text-foreground">{t.details}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-text">
                {t.name}
              </label>
              <input id="name" name="name" required className={fieldClass} placeholder={t.namePh} />
            </div>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-text">
                {t.email}
              </label>
              <input id="email" name="email" type="email" required className={fieldClass} placeholder={t.emailPh} />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-text">
                {t.phone}
              </label>
              <input id="phone" name="phone" type="tel" className={fieldClass} placeholder="+225 07 00 00 00 00" />
            </div>
            <div>
              <label htmlFor="company" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-text">
                {t.company}
              </label>
              <input id="company" name="company" className={fieldClass} placeholder={t.companyPh} />
            </div>
            <div>
              <label htmlFor="budget" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-text">
                {t.budget}
              </label>
              <select id="budget" name="budget" required className={cn(fieldClass, "cursor-pointer")}>
                <option value="">{t.choose}</option>
                {budgetOpts.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="timeline" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-text">
                {t.timeline}
              </label>
              <select id="timeline" name="timeline" required className={cn(fieldClass, "cursor-pointer")}>
                <option value="">{t.choose}</option>
                {timelineOpts.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="message" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-text">
              {t.message}
            </label>
            <textarea id="message" name="message" rows={3} className={cn(fieldClass, "resize-y")} placeholder={t.messagePh} />
          </div>
        </div>

        {state === "error" && (
          <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-accent-dark">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            {errorMessage}
          </div>
        )}

        {required && (
          <TurnstileWidget
            onToken={setTurnstileToken}
            onExpire={onExpire}
          />
        )}

        {isPresentation && (
          <label className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
            <input
              type="checkbox"
              checked={clientValidatedOrally}
              onChange={(e) => setClientValidatedOrally(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray/60 text-primary focus:ring-primary/30"
            />
            <span>
              Le client confirme oralement ce brief et accepte que SD CREATIV le traite pour
              établir un devis personnalisé.
            </span>
          </label>
        )}

        <div className="flex flex-col gap-5 border-t border-gray/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-xs leading-relaxed text-gray-text">
            {isPresentation ? (
              <>Brief interne — enregistré au CRM SD CREATIV avec la source « Présentation tablette ».</>
            ) : (
              <>
                {t.privacyPrefix}{" "}
                <a
                  href={t.privacyHref}
                  className="font-medium text-primary underline underline-offset-2"
                >
                  {t.privacyLink}
                </a>
                {t.privacySuffix}
              </>
            )}
          </p>

          <Button type="submit" size="lg" disabled={state === "loading"} className="w-full shrink-0 justify-center sm:w-auto">
          {state === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t.submitting}
            </>
          ) : isPresentation ? (
            <>
              Valider et envoyer au CRM
              <Send className="h-4 w-4" aria-hidden />
            </>
          ) : (
            <>
              {t.submit}
              <Send className="h-4 w-4" aria-hidden />
            </>
          )}
        </Button>
        </div>
      </form>

      <aside className="sticky top-28 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary-light to-white p-6 shadow-lg md:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
            <Calculator className="h-5 w-5" aria-hidden />
          </div>
          <h3 className="font-bold text-foreground">{t.summaryTitle}</h3>
        </div>

        {quote && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-foreground">{quote.projectLabel}</p>
            <ul className="mt-4 space-y-2 border-b border-gray/40 pb-4 text-sm">
              {quote.lines.map((line) => (
                <li key={line.label} className="flex items-start gap-2 text-gray-text">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span>{line.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-base font-bold text-primary">{t.summaryPrice}</p>
            <p className="mt-1 text-sm text-gray-text">{t.summaryHint}</p>
            <p className="mt-4 text-xs leading-relaxed text-gray-text">{quote.note}</p>
          </div>
        )}
      </aside>
    </div>
  );
}
