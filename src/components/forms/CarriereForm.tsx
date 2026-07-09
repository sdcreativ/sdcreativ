"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Clock,
  Car,
  Link2,
  FileText,
  ChevronDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { HoneypotField } from "@/components/forms/HoneypotField";
import { TurnstileWidget } from "@/components/forms/TurnstileWidget";
import { useFormTurnstile } from "@/components/forms/useFormTurnstile";
import {
  jobSelectOptions as staticJobSelectOptions,
  experienceOptions,
  availabilityOptions,
} from "@/content/carrieres";
import { cn } from "@/lib/utils";

type FormState = "idle" | "loading" | "success" | "error";

type Props = {
  className?: string;
  defaultJobId?: string;
  jobSelectOptions?: ReadonlyArray<{ value: string; label: string }>;
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
  "w-full rounded-xl border border-gray/80 bg-white px-4 py-3.5 text-sm text-foreground shadow-sm transition-all duration-200 placeholder:text-gray-text/50 hover:border-primary/30 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";

function SelectChevron() {
  return (
    <ChevronDown
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text"
      aria-hidden
    />
  );
}

export function CarriereForm({
  className,
  defaultJobId = "",
  jobSelectOptions = staticJobSelectOptions,
}: Props) {
  const searchParams = useSearchParams();
  const [jobId, setJobId] = useState(defaultJobId);
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const { turnstileToken, setTurnstileToken, validate, reset, required } = useFormTurnstile();

  useEffect(() => {
    const poste = searchParams.get("poste");
    if (poste && jobSelectOptions.some((o) => o.value === poste)) {
      setJobId(poste);
    }
  }, [searchParams]);

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
      const res = await fetch("/api/carriere", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          city: data.get("city"),
          jobId: data.get("jobId"),
          experience: data.get("experience"),
          availability: data.get("availability"),
          hasVehicle: data.get("hasVehicle"),
          linkedin: data.get("linkedin") || undefined,
          cvLink: data.get("cvLink") || undefined,
          motivation: data.get("motivation"),
          _hp: data.get("_hp"),
          turnstileToken: turnstileToken || undefined,
        }),
      });

      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(json.error ?? "Une erreur est survenue.");
      }

      setState("success");
      form.reset();
      setJobId("");
      reset();
    } catch (err) {
      setState("error");
      setErrorMessage(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  }

  if (state === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "rounded-3xl border border-primary/20 bg-gradient-to-br from-primary-light via-white to-white p-10 text-center shadow-lg",
          className,
        )}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
          <CheckCircle className="h-8 w-8 text-white" aria-hidden />
        </div>
        <h3 className="mt-6 text-2xl font-bold text-foreground">Candidature envoyée !</h3>
        <p className="mx-auto mt-3 max-w-sm text-gray-text">
          Merci pour votre intérêt. Notre équipe RH vous recontactera sous 5 à 10 jours ouvrés.
        </p>
        <Button type="button" variant="ghost" className="mt-8" onClick={() => setState("idle")}>
          Nouvelle candidature
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "overflow-hidden rounded-3xl border border-gray/60 bg-white shadow-xl shadow-primary/5",
        className,
      )}
    >
      <div className="h-1.5 bg-gradient-to-r from-primary via-primary-light to-primary" />

      <div className="p-8 md:p-10">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground md:text-2xl">
            Postuler chez SD CREATIV
          </h2>
          <p className="mt-2 text-sm text-gray-text">
            Remplissez le formulaire ci-dessous. Joignez un lien vers votre CV (Google Drive,
            LinkedIn, Canva…).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative space-y-6" noValidate>
          <HoneypotField />
          <FormField
            id="jobId"
            label="Poste visé"
            required
            icon={<Briefcase className="h-3.5 w-3.5" aria-hidden />}
          >
            <div className="relative">
              <select
                aria-label="Poste visé"
                id="jobId"
                name="jobId"
                required
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className={cn(fieldClass, "cursor-pointer appearance-none pr-10")}
              >
                <option value="">Sélectionnez un poste</option>
                {jobSelectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </FormField>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              id="name"
              label="Nom complet"
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
                placeholder="Prénom Nom"
              />
            </FormField>

            <FormField
              id="email"
              label="Email"
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
                placeholder="vous@email.com"
              />
            </FormField>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              id="phone"
              label="Téléphone / WhatsApp"
              required
              icon={<Phone className="h-3.5 w-3.5" aria-hidden />}
            >
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                className={fieldClass}
                placeholder="+225 07 00 00 00 00"
              />
            </FormField>

            <FormField
              id="city"
              label="Ville / zone"
              required
              icon={<MapPin className="h-3.5 w-3.5" aria-hidden />}
            >
              <input
                id="city"
                name="city"
                type="text"
                required
                className={fieldClass}
                placeholder="Ex. Cocody, Bouaké, Paris…"
              />
            </FormField>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              id="experience"
              label="Expérience commerciale"
              required
              icon={<Briefcase className="h-3.5 w-3.5" aria-hidden />}
            >
              <div className="relative">
                <select
                  aria-label="Expérience commerciale"
                  id="experience"
                  name="experience"
                  required
                  className={cn(fieldClass, "cursor-pointer appearance-none pr-10")}
                >
                  <option value="">Choisir</option>
                  {experienceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <SelectChevron />
              </div>
            </FormField>

            <FormField
              id="availability"
              label="Disponibilité"
              required
              icon={<Clock className="h-3.5 w-3.5" aria-hidden />}
            >
              <div className="relative">
                <select
                  aria-label="Disponibilité"
                  id="availability"
                  name="availability"
                  required
                  className={cn(fieldClass, "cursor-pointer appearance-none pr-10")}
                >
                  <option value="">Choisir</option>
                  {availabilityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <SelectChevron />
              </div>
            </FormField>
          </div>

          <FormField
            id="hasVehicle"
            label="Permis B / véhicule"
            required
            icon={<Car className="h-3.5 w-3.5" aria-hidden />}
          >
            <div className="relative">
              <select
                aria-label="Permis B / véhicule"
                id="hasVehicle"
                name="hasVehicle"
                required
                className={cn(fieldClass, "cursor-pointer appearance-none pr-10")}
              >
                <option value="">Choisir</option>
                <option value="oui">Oui</option>
                <option value="non">Non</option>
              </select>
              <SelectChevron />
            </div>
          </FormField>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              id="cvLink"
              label="Lien CV"
              icon={<FileText className="h-3.5 w-3.5" aria-hidden />}
            >
              <input
                id="cvLink"
                name="cvLink"
                type="url"
                className={fieldClass}
                placeholder="https://drive.google.com/..."
              />
            </FormField>

            <FormField
              id="linkedin"
              label="LinkedIn / portfolio"
              icon={<Link2 className="h-3.5 w-3.5" aria-hidden />}
            >
              <input
                id="linkedin"
                name="linkedin"
                type="url"
                className={fieldClass}
                placeholder="https://linkedin.com/in/..."
              />
            </FormField>
          </div>

          <FormField
            id="motivation"
            label="Motivation"
            required
            icon={<FileText className="h-3.5 w-3.5" aria-hidden />}
          >
            <textarea
              id="motivation"
              name="motivation"
              required
              rows={5}
              minLength={50}
              className={cn(fieldClass, "min-h-[140px] resize-y leading-relaxed")}
              placeholder="Pourquoi souhaitez-vous rejoindre SD CREATIV ? Votre expérience commerciale, votre réseau local…"
            />
          </FormField>

          {state === "error" && (
            <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-accent-dark">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              {errorMessage}
            </div>
          )}

          {required && (
            <TurnstileWidget
              onToken={setTurnstileToken}
              onExpire={() => setTurnstileToken("")}
            />
          )}

          <div className="flex flex-col gap-5 border-t border-gray/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xs text-xs text-gray-text">
              En postulant, vous acceptez notre{" "}
              <a href="/politique-confidentialite" className="text-primary hover:underline">
                politique de confidentialité
              </a>
              .
            </p>
            <Button
              type="submit"
              size="lg"
              disabled={state === "loading"}
              className="w-full sm:w-auto"
            >
              {state === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Envoi…
                </>
              ) : (
                <>
                  Envoyer ma candidature
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
