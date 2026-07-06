"use client";

import { useState, type FormEvent } from "react";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { HoneypotField } from "@/components/forms/HoneypotField";

type Props = {
  defaultInterest?: "espace-client" | "crm" | "general";
  className?: string;
};

type FormState = "idle" | "loading" | "success" | "error";

const fieldClass =
  "w-full rounded-xl border border-gray/80 bg-white px-4 py-3.5 text-sm text-foreground shadow-sm transition-all placeholder:text-gray-text/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";

export function WaitlistForm({
  defaultInterest = "espace-client",
  className,
}: Props) {
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setError("");

    const data = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          company: data.get("company") || undefined,
          interest: data.get("interest"),
          message: data.get("message") || undefined,
          _hp: data.get("_hp"),
        }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur");

      setState("success");
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className={cn("rounded-2xl bg-primary-light p-8 text-center", className)}>
        <CheckCircle className="mx-auto h-10 w-10 text-primary" aria-hidden />
        <p className="mt-4 font-semibold text-foreground">Merci ! Nous vous recontactons bientôt.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("relative space-y-4", className)}>
      <HoneypotField />
      <input type="hidden" name="interest" value={defaultInterest} />
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="name" required placeholder="Nom *" className={fieldClass} />
        <input name="email" type="email" required placeholder="Email *" className={fieldClass} />
      </div>
      <input name="company" placeholder="Entreprise (optionnel)" className={fieldClass} />
      <textarea
        name="message"
        rows={3}
        placeholder="Votre message (optionnel)"
        className={fieldClass}
      />
      {state === "error" && error && (
        <p className="flex items-center gap-2 text-sm text-accent">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={state === "loading"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 sm:w-auto"
      >
        {state === "loading" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Rejoindre la liste d&apos;attente
      </button>
    </form>
  );
}
