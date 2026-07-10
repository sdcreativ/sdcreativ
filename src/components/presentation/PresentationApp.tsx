"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Monitor,
  Play,
  RotateCcw,
  Tablet,
} from "lucide-react";
import { QuoteConfigurator } from "@/components/forms/QuoteConfigurator";
import { SlideViewer } from "@/components/presentation/SlideViewer";
import { Button } from "@/components/ui/Button";
import type { SiteQuoteConfigSettings } from "@/lib/site-quote-config-types";
import {
  getSlidesForTrack,
  PRESENTATION_LOCATION_LABELS,
} from "@/lib/presentation-slides";
import type {
  PresentationLocation,
  PresentationSessionSetup,
  PresentationTrack,
} from "@/lib/presentation-types";
import { cn } from "@/lib/utils";

type Phase = "setup" | "slides" | "devis" | "success";

type SessionInfo = {
  userId: string;
  name: string;
  email: string;
};

type Props = {
  config: SiteQuoteConfigSettings;
};

const fieldClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20";

export function PresentationApp({ config }: Props) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);

  const [track, setTrack] = useState<PresentationTrack>("salon");
  const [location, setLocation] = useState<PresentationLocation>("salon");
  const [locationNote, setLocationNote] = useState("");
  const [clientSector, setClientSector] = useState("");
  const [presenterNotes, setPresenterNotes] = useState("");
  const [startedAt, setStartedAt] = useState<string>("");

  const [slideIndex, setSlideIndex] = useState(0);
  const [completedSlideIds, setCompletedSlideIds] = useState<string[]>([]);
  const [successLeadId, setSuccessLeadId] = useState<string | null>(null);

  const slides = useMemo(() => getSlidesForTrack(track), [track]);
  const currentSlide = slides[slideIndex];

  const loadSession = useCallback(async () => {
    setLoadingSession(true);
    setSessionError("");
    try {
      const res = await fetch("/api/presentation/session");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Session invalide.");
      setSession({
        userId: json.userId,
        name: json.name,
        email: json.email,
      });
    } catch (err) {
      setSession(null);
      setSessionError(err instanceof Error ? err.message : "Connexion requise.");
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (track === "salon") {
      setLocation("salon");
    } else if (location === "salon") {
      setLocation("bureau_client");
    }
  }, [track, location]);

  useEffect(() => {
    if (!currentSlide) return;
    setCompletedSlideIds((prev) =>
      prev.includes(currentSlide.id) ? prev : [...prev, currentSlide.id],
    );
  }, [currentSlide]);

  function startPresentation() {
    setStartedAt(new Date().toISOString());
    setSlideIndex(0);
    setCompletedSlideIds([]);
    setPhase("slides");
  }

  function resetAll() {
    setPhase("setup");
    setSlideIndex(0);
    setCompletedSlideIds([]);
    setSuccessLeadId(null);
    setStartedAt("");
    setPresenterNotes("");
    setClientSector("");
    setLocationNote("");
  }

  const setup: PresentationSessionSetup | null = startedAt
    ? { track, location, locationNote: locationNote.trim() || undefined, clientSector: clientSector.trim() || undefined, startedAt }
    : null;

  const presentationMeta = session && setup
    ? {
        track: setup.track,
        location: setup.location,
        locationNote: setup.locationNote,
        clientSector: setup.clientSector,
        presenterNotes: presenterNotes.trim() || undefined,
        presenterId: session.userId,
        presenterName: session.name,
        presenterEmail: session.email,
        slidesCompleted: completedSlideIds,
        startedAt: setup.startedAt,
      }
    : null;

  if (loadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#071525] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary-light" aria-hidden />
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#071525] px-6 text-center text-white">
        <p>{sessionError || "Connectez-vous au CRM pour lancer une présentation."}</p>
        <Button href="/admin/login?from=/presentation">Se connecter</Button>
      </div>
    );
  }

  if (phase === "success") {
    return (
      <div className="flex min-h-screen flex-col bg-[#071525] text-white">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold">Brief enregistré</p>
              <p className="text-xs text-white/55">Présentateur : {session.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/5"
          >
            <RotateCcw className="h-4 w-4" />
            Nouvelle session
          </button>
        </header>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
          <div className="relative aspect-[4/3] w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            <Image
              src="/presentation/captures/CAP-20-demande-envoyee.png"
              alt="Demande envoyée"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 640px"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Brief client transmis au CRM</h1>
            <p className="mt-2 max-w-lg text-sm text-white/70 md:text-base">
              Le lead est créé avec la source « Présentation tablette ». Le devis indicatif et
              l&apos;activité sont enregistrés pour le suivi commercial.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {successLeadId ? (
              <Button href={`/admin/crm/leads?source=presentation_tablet`}>
                Ouvrir les leads tablette
              </Button>
            ) : (
              <Button href="/admin/crm/leads?source=presentation_tablet">Voir les leads tablette</Button>
            )}
            <Button href="/admin/crm" variant="ghost" className="border border-white/15 text-white hover:bg-white/5">
              Retour CRM
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "devis" && presentationMeta) {
    return (
      <div className="min-h-screen bg-gray-light">
        <header className="sticky top-0 z-20 border-b border-gray/50 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
            <button
              type="button"
              onClick={() => setPhase("slides")}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-text hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux slides
            </button>
            <div className="text-right text-xs text-gray-text">
              <p className="font-semibold text-foreground">Brief client — {session.name}</p>
              <p>
                {track === "salon" ? "Parcours salon" : "Parcours bureau"} ·{" "}
                {PRESENTATION_LOCATION_LABELS[location]}
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
          <QuoteConfigurator
            config={config}
            variant="presentation"
            presentationMeta={presentationMeta}
            onPresentationSuccess={(leadId) => {
              setSuccessLeadId(leadId);
              setPhase("success");
            }}
          />
        </main>
      </div>
    );
  }

  if (phase === "slides" && currentSlide) {
    const isLast = slideIndex >= slides.length - 1;

    return (
      <div className="flex h-screen flex-col bg-[#071525] text-white">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={() => setPhase("setup")}
            className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-white/70 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Configuration
          </button>
          <div className="hidden text-center sm:block">
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">Présentation tablette</p>
            <p className="text-sm font-semibold">
              {track === "salon" ? "Salon (~5 min)" : "Bureau (~15 min)"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPhase("devis")}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Passer au brief
          </button>
        </header>

        <div className="min-h-0 flex-1">
          <SlideViewer
            slide={currentSlide}
            index={slideIndex}
            total={slides.length}
            canPrevious={slideIndex > 0}
            canNext={!isLast}
            onPrevious={() => setSlideIndex((i) => Math.max(0, i - 1))}
            onNext={() => setSlideIndex((i) => Math.min(slides.length - 1, i + 1))}
          />
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 md:px-6">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((slideIndex + 1) / slides.length) * 100}%` }}
            />
          </div>
          {isLast ? (
            <button
              type="button"
              onClick={() => setPhase("devis")}
              className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              Configurateur client
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSlideIndex((i) => Math.min(slides.length - 1, i + 1))}
              className="shrink-0 rounded-xl border border-white/15 px-4 py-2 text-sm font-medium hover:bg-white/5"
            >
              Suivant
            </button>
          )}
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#071525] text-white">
      <header className="border-b border-white/10 px-4 py-5 md:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
              SD CREATIV
            </p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">Présentation tablette</h1>
          </div>
          <Link
            href="/admin/crm"
            className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/75 hover:bg-white/5 hover:text-white"
          >
            CRM
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
        <p className="text-sm text-white/65 md:text-base">
          Connecté en tant que <span className="font-semibold text-white">{session.name}</span>.
          Choisissez le parcours et le lieu avant de lancer les slides.
        </p>

        <div className="mt-8 space-y-8">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/45">
              Parcours
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    id: "salon" as const,
                    label: "Salon / foire",
                    hint: "7 slides · ~5 minutes",
                    icon: Tablet,
                  },
                  {
                    id: "bureau" as const,
                    label: "Bureau / visio",
                    hint: "15 slides · ~15 minutes",
                    icon: Monitor,
                  },
                ] as const
              ).map((option) => {
                const Icon = option.icon;
                const active = track === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setTrack(option.id)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/15 ring-1 ring-primary/40"
                        : "border-white/10 bg-white/5 hover:bg-white/10",
                    )}
                  >
                    <Icon className="h-5 w-5 text-primary-light" />
                    <p className="mt-3 font-semibold">{option.label}</p>
                    <p className="mt-1 text-sm text-white/60">{option.hint}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <label htmlFor="presentation-location" className="text-sm font-semibold uppercase tracking-[0.16em] text-white/45">
              Lieu de la présentation
            </label>
            <select
              id="presentation-location"
              value={location}
              onChange={(e) => setLocation(e.target.value as PresentationLocation)}
              className={cn(fieldClass, "mt-3 cursor-pointer")}
            >
              {Object.entries(PRESENTATION_LOCATION_LABELS)
                .filter(([value]) => track !== "bureau" || value !== "salon")
                .map(([value, label]) => (
                  <option key={value} value={value} className="text-foreground">
                    {label}
                  </option>
                ))}
            </select>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="location-note" className="mb-2 block text-sm font-medium text-white/75">
                Précision lieu (optionnel)
              </label>
              <input
                id="location-note"
                value={locationNote}
                onChange={(e) => setLocationNote(e.target.value)}
                className={fieldClass}
                placeholder="Ex. Africa CEO Forum, stand B12"
              />
            </div>
            <div>
              <label htmlFor="client-sector" className="mb-2 block text-sm font-medium text-white/75">
                Secteur client (optionnel)
              </label>
              <input
                id="client-sector"
                value={clientSector}
                onChange={(e) => setClientSector(e.target.value)}
                className={fieldClass}
                placeholder="Ex. restauration, immobilier…"
              />
            </div>
          </div>

          <div>
            <label htmlFor="presenter-notes" className="mb-2 block text-sm font-medium text-white/75">
              Notes présentateur (optionnel)
            </label>
            <textarea
              id="presenter-notes"
              value={presenterNotes}
              onChange={(e) => setPresenterNotes(e.target.value)}
              rows={3}
              className={cn(fieldClass, "resize-y")}
              placeholder="Objections, contexte, prochaines étapes…"
            />
          </div>

          <button
            type="button"
            onClick={startPresentation}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-white hover:bg-primary-dark sm:w-auto"
          >
            <Play className="h-5 w-5" />
            Lancer la présentation
          </button>
        </div>
      </main>
    </div>
  );
}
