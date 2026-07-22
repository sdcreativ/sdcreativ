"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Camera,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageOff,
  Search,
} from "lucide-react";
import {
  CRM_DOC_CATEGORIES,
  CRM_DOC_FEATURES,
  searchCrmDocFeatures,
  type CrmDocCategoryId,
  type CrmDocFeature,
} from "@/content/crm-docs/catalog";
import { cn } from "@/lib/utils";

export function CrmDocumentationView() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CrmDocCategoryId | "all" | "recent">("all");

  const features = useMemo(() => {
    let list = searchCrmDocFeatures(query);
    if (category === "recent") list = list.filter((f) => f.recent);
    else if (category !== "all") list = list.filter((f) => f.category === category);
    return list;
  }, [query, category]);

  const withScreenshot = CRM_DOC_FEATURES.filter((f) => (f.screenshots?.length ?? 0) > 0).length;
  const screenshotFiles = new Set(
    CRM_DOC_FEATURES.flatMap((f) => f.screenshots ?? []),
  ).size;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-gray/25 bg-gradient-to-br from-white to-sky-50/50 px-5 py-5 shadow-sm">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-foreground">Documentation interne</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-text">
              Catalogue des fonctionnalités CRM & site : explication, fonctionnement, lien
              d’accès et capture d’écran lorsque disponible.
            </p>
            <p className="mt-2 text-xs text-gray-text">
              {CRM_DOC_FEATURES.length} fiches · {withScreenshot} illustrées · {screenshotFiles}{" "}
              fichier(s) dans <code className="rounded bg-white/80 px-1">public/crm-docs/</code>
            </p>
          </div>
        </div>

        <label className="relative mt-4 block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une fonctionnalité…"
            className="w-full rounded-xl border border-gray/40 bg-white py-2.5 pl-10 pr-3 text-sm outline-none ring-primary/30 focus:ring-2"
          />
        </label>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56">
          <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-gray/25 bg-white p-1.5 lg:flex-col lg:overflow-visible">
            <CategoryButton
              active={category === "all"}
              onClick={() => setCategory("all")}
              label="Tout"
              count={CRM_DOC_FEATURES.length}
            />
            <CategoryButton
              active={category === "recent"}
              onClick={() => setCategory("recent")}
              label="Récent (juil. 2026)"
              count={CRM_DOC_FEATURES.filter((f) => f.recent).length}
            />
            {CRM_DOC_CATEGORIES.map((cat) => (
              <CategoryButton
                key={cat.id}
                active={category === cat.id}
                onClick={() => setCategory(cat.id)}
                label={cat.label}
                count={CRM_DOC_FEATURES.filter((f) => f.category === cat.id).length}
              />
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          {features.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray/40 px-4 py-10 text-center text-sm text-gray-text">
              Aucune fiche ne correspond à votre recherche.
            </p>
          ) : (
            features.map((feature) => <FeatureCard key={feature.id} feature={feature} />)
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors lg:w-full",
        active ? "bg-primary text-white shadow-sm" : "text-gray-text hover:bg-gray-light/70",
      )}
    >
      <span className="font-medium">{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
          active ? "bg-white/20 text-white" : "bg-gray/25 text-gray-text",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function FeatureCard({ feature }: { feature: CrmDocFeature }) {
  const categoryLabel =
    CRM_DOC_CATEGORIES.find((c) => c.id === feature.category)?.label ?? feature.category;

  return (
    <article
      id={feature.id}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-gray/25 bg-white shadow-sm"
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(220px,320px)]">
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">{feature.title}</h2>
            {feature.recent ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                Récent
              </span>
            ) : null}
            <span className="rounded-full bg-gray/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-text">
              {categoryLabel}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground/90">{feature.summary}</p>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-text">
              Explication
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground/85">{feature.explanation}</p>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-text">
              Fonctionnement
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground/85">{feature.howItWorks}</p>
          </section>

          {feature.href ? (
            <Link
              href={feature.href}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              Ouvrir dans le CRM
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          ) : null}
        </div>

        <div className="border-t border-gray/20 bg-gray-light/30 p-3 lg:border-l lg:border-t-0">
          {(feature.screenshots?.length ?? 0) > 0 ? (
            <FeatureScreenshots title={feature.title} files={feature.screenshots!} />
          ) : (
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray/40 bg-white/60 px-4 py-8 text-center">
              <ImageOff className="h-7 w-7 text-gray-text/50" aria-hidden />
              <p className="text-xs font-medium text-gray-text">Capture à ajouter</p>
              <p className="max-w-[220px] text-[11px] leading-relaxed text-gray-text/80">
                Déposez{" "}
                <code className="rounded bg-gray/20 px-1">{feature.id}.png</code> dans{" "}
                <code className="rounded bg-gray/20 px-1">public/crm-docs/</code> puis renseignez{" "}
                <code className="rounded bg-gray/20 px-1">screenshots</code> dans le catalogue.
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function FeatureScreenshots({ title, files }: { title: string; files: string[] }) {
  const [index, setIndex] = useState(0);
  const [missing, setMissing] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setIndex(0);
    setMissing(new Set());
  }, [files]);

  const available = files.filter((f) => !missing.has(f));
  const pending = files.filter((f) => missing.has(f));

  useEffect(() => {
    if (available.length === 0) return;
    if (index >= available.length) setIndex(0);
  }, [available.length, index]);

  if (available.length === 0) {
    return (
      <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300/70 bg-amber-50/50 px-4 py-8 text-center">
        <ImageOff className="h-7 w-7 text-amber-700/60" aria-hidden />
        <p className="text-xs font-semibold text-amber-900">Capture(s) en attente</p>
        <ul className="max-w-[240px] space-y-1 text-[11px] text-amber-900/80">
          {files.map((file) => (
            <li key={file}>
              <code className="rounded bg-white/80 px-1">{file}</code>
            </li>
          ))}
        </ul>
        <p className="max-w-[240px] text-[11px] text-amber-900/70">
          Déposez le(s) fichier(s) dans <code className="rounded bg-white/80 px-1">public/crm-docs/</code>
        </p>
      </div>
    );
  }

  const current = available[Math.min(index, available.length - 1)]!;
  const multi = available.length > 1;

  return (
    <figure className="overflow-hidden rounded-xl border border-gray/30 bg-white">
      <div className="relative">
        <Image
          src={`/crm-docs/${current}`}
          alt={`Capture ${index + 1}/${available.length} — ${title}`}
          width={640}
          height={400}
          className="h-auto max-h-[420px] w-full object-cover object-top"
          onError={() => setMissing((prev) => new Set(prev).add(current))}
        />
        {multi ? (
          <>
            <button
              type="button"
              aria-label="Capture précédente"
              onClick={() => setIndex((i) => (i - 1 + available.length) % available.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white hover:bg-black/70"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Capture suivante"
              onClick={() => setIndex((i) => (i + 1) % available.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white hover:bg-black/70"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </>
        ) : null}
      </div>
      <figcaption className="flex items-center justify-between gap-2 px-2.5 py-2 text-[11px] text-gray-text">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Camera className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{current}</span>
        </span>
        {multi ? (
          <span className="shrink-0 font-semibold">
            {index + 1}/{available.length}
          </span>
        ) : null}
      </figcaption>
      {multi ? (
        <div className="flex gap-1.5 overflow-x-auto border-t border-gray/15 px-2 py-2">
          {available.map((file, i) => (
            <button
              key={file}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "relative h-12 w-16 shrink-0 overflow-hidden rounded-md border",
                i === index ? "border-primary ring-1 ring-primary" : "border-gray/30 opacity-70",
              )}
              aria-label={`Voir capture ${i + 1}`}
            >
              <Image
                src={`/crm-docs/${file}`}
                alt=""
                fill
                className="object-cover object-top"
                sizes="64px"
                onError={() => setMissing((prev) => new Set(prev).add(file))}
              />
            </button>
          ))}
        </div>
      ) : null}
      {pending.length > 0 ? (
        <p className="border-t border-amber-200/60 bg-amber-50/40 px-2.5 py-1.5 text-[10px] text-amber-900/80">
          En attente : {pending.join(", ")}
        </p>
      ) : null}
    </figure>
  );
}
