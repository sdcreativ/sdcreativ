"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  User,
  Mail,
  Phone,
  Building2,
  MessageSquare,
  ChevronDown,
  Inbox,
  Tag,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { HoneypotField } from "@/components/forms/HoneypotField";
import { TurnstileWidget } from "@/components/forms/TurnstileWidget";
import { useFormTurnstile } from "@/components/forms/useFormTurnstile";
import { contactFormCopy, getContactSubjectOptions, type FormLocale } from "@/i18n/form-copy";
import { cn } from "@/lib/utils";

type FormState = "idle" | "loading" | "success" | "error";

type ContactFormProps = {
  className?: string;
  defaultSubject?: string;
  locale?: FormLocale;
};

type FormFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  icon: ReactNode;
  children: ReactNode;
};

function FormField({ id, label, required, icon, children }: FormFieldProps) {
  return (
    <div className="group relative">
      <label
        htmlFor={id}
        className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-text transition-colors group-focus-within:text-primary"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-light/80 text-primary transition-colors group-focus-within:bg-primary group-focus-within:text-white">
          {icon}
        </span>
        {label}
        {required && <span className="text-accent">*</span>}
      </label>
      {children}
    </div>
  );
}

const fieldClass =
  "w-full rounded-xl border border-gray/80 bg-white px-4 py-3.5 text-sm text-foreground shadow-sm transition-all duration-200 placeholder:text-gray-text/50 hover:border-primary/30 hover:shadow-md focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10";

export function ContactForm({
  className,
  defaultSubject = "",
  locale = "fr",
}: ContactFormProps) {
  const t = contactFormCopy[locale];
  const subjectOptions = getContactSubjectOptions(locale);
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const { turnstileToken, setTurnstileToken, validate, reset, onExpire, required } = useFormTurnstile();

  const resolvedDefaultSubject =
    defaultSubject && subjectOptions.some((option) => option.value === defaultSubject)
      ? defaultSubject
      : "";

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

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          company: data.get("company"),
          subject: data.get("subject"),
          message: data.get("message"),
          _hp: data.get("_hp"),
          turnstileToken: turnstileToken || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? t.errorFallback);
      }

      setState("success");
      form.reset();
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
        className={cn(
          "relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary-light via-white to-white p-10 text-center shadow-lg",
          className,
        )}
      >
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
            <CheckCircle className="h-8 w-8 text-white" aria-hidden />
          </div>
          <h3 className="mt-6 text-2xl font-bold text-foreground">{t.successTitle}</h3>
          <p className="mx-auto mt-3 max-w-sm leading-relaxed text-gray-text">{t.successBody}</p>
          <Button
            type="button"
            variant="ghost"
            className="mt-8"
            onClick={() => setState("idle")}
          >
            {t.successAgain}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-gray/60 bg-white shadow-xl shadow-primary/5",
        className,
      )}
    >
      <div className="h-1.5 bg-gradient-to-r from-primary via-primary-light to-primary" />

      <div className="p-8 md:p-10">
        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-light">
            <Inbox className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground md:text-2xl">{t.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-text">{t.subtitle}</p>
          </div>
        </div>

        <p className="mb-6 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-gray-text">
          {t.quoteHint}{" "}
          <Link href={t.quoteHref} className="font-semibold text-primary underline underline-offset-2">
            {t.quoteLink}
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="relative space-y-6" noValidate>
          <HoneypotField />
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              id="name"
              label={t.name}
              required
              icon={<User className="h-3.5 w-3.5" aria-hidden />}
            >
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                className={fieldClass}
                placeholder={t.namePh}
              />
            </FormField>

            <FormField
              id="email"
              label={t.email}
              required
              icon={<Mail className="h-3.5 w-3.5" aria-hidden />}
            >
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className={fieldClass}
                placeholder={t.emailPh}
              />
            </FormField>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              id="phone"
              label={t.phone}
              icon={<Phone className="h-3.5 w-3.5" aria-hidden />}
            >
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className={fieldClass}
                placeholder={t.phonePh}
              />
            </FormField>

            <FormField
              id="company"
              label={t.company}
              icon={<Building2 className="h-3.5 w-3.5" aria-hidden />}
            >
              <input
                id="company"
                name="company"
                type="text"
                autoComplete="organization"
                className={fieldClass}
                placeholder={t.companyPh}
              />
            </FormField>
          </div>

          <FormField
            id="subject"
            label={t.subject}
            required
            icon={<Tag className="h-3.5 w-3.5" aria-hidden />}
          >
            <div className="relative">
              <select
                aria-label={t.subject}
                id="subject"
                name="subject"
                required
                defaultValue={resolvedDefaultSubject}
                className={cn(fieldClass, "cursor-pointer appearance-none pr-10")}
              >
                <option value="">{t.subjectPlaceholder}</option>
                {subjectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text"
                aria-hidden
              />
            </div>
          </FormField>

          <FormField
            id="message"
            label={t.message}
            required
            icon={<MessageSquare className="h-3.5 w-3.5" aria-hidden />}
          >
            <textarea
              id="message"
              name="message"
              required
              rows={5}
              className={cn(fieldClass, "min-h-[140px] resize-y leading-relaxed")}
              placeholder={t.messagePh}
            />
          </FormField>

          {state === "error" && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-accent-dark"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              {errorMessage}
            </motion.div>
          )}

          {required && (
            <TurnstileWidget onToken={setTurnstileToken} onExpire={onExpire} />
          )}

          <div className="flex flex-col gap-5 border-t border-gray/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xs text-xs leading-relaxed text-gray-text">
              {t.privacyPrefix}{" "}
              <a
                href={t.privacyHref}
                className="font-medium text-primary underline underline-offset-2"
              >
                {t.privacyLink}
              </a>
              .
            </p>

            <Button
              type="submit"
              size="lg"
              disabled={state === "loading"}
              className="w-full shrink-0 shadow-lg shadow-primary/25 sm:w-auto"
            >
              {state === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {t.submitting}
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
      </div>
    </motion.div>
  );
}
