"use client";

import Link from "next/link";
import { useState } from "react";
import { Calculator, Inbox, Search, ArrowRight } from "lucide-react";
import { RealisationCard } from "@/components/realisations/RealisationCard";
import { PortfolioStats } from "@/components/realisations/PortfolioStats";
import type { Realisation } from "@/content/realisations";
import type { PortfolioPublicStat } from "@/lib/portfolio-public-stats";
import { cn } from "@/lib/utils";

type Locale = "fr" | "en";

const nextStepsByLocale = {
  fr: [
    {
      icon: Calculator,
      title: "Estimer mon projet",
      description:
        "Configurateur en ligne — type de projet, options et demande de devis personnalisé.",
      href: "/devis",
      cta: "Configurer mon devis",
      featured: true,
    },
    {
      icon: Search,
      title: "Audit gratuit",
      description:
        "Vous avez déjà un site ? Analyse performance, SEO et mobile, sans engagement.",
      href: "/audit-gratuit",
      cta: "Demander un audit",
      featured: false,
    },
    {
      icon: Inbox,
      title: "Nous écrire",
      description:
        "Une question sur nos réalisations ou votre besoin ? Message direct à l'équipe.",
      href: "/contact",
      cta: "Envoyer un message",
      featured: false,
    },
  ],
  en: [
    {
      icon: Calculator,
      title: "Estimate my project",
      description:
        "Online configurator — project type, options and a free personalized quote.",
      href: "/en/devis",
      cta: "Configure my quote",
      featured: true,
    },
    {
      icon: Search,
      title: "Free audit",
      description:
        "Already have a website? Performance, SEO and mobile review — no commitment.",
      href: "/en/free-audit",
      cta: "Request an audit",
      featured: false,
    },
    {
      icon: Inbox,
      title: "Write to us",
      description:
        "A question about our work or your needs? Message the team directly.",
      href: "/en/contact",
      cta: "Send a message",
      featured: false,
    },
  ],
} as const;

type CategoryFilterButtonProps = {
  label: string;
  pressed: boolean;
  onSelect: () => void;
};

function CategoryFilterButton({ label, pressed, onSelect }: CategoryFilterButtonProps) {
  const className = cn(
    "rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200",
    pressed
      ? "bg-primary text-white shadow-md shadow-primary/25"
      : "bg-gray-light text-gray-text hover:bg-primary-light hover:text-primary",
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      className={className}
      aria-pressed={pressed}
    >
      {label}
    </button>
  );
}

type Props = {
  items?: Realisation[];
  stats?: PortfolioPublicStat[];
  locale?: Locale;
};

export function RealisationsGrid({ items = [], stats = [], locale = "fr" }: Props) {
  const isEn = locale === "en";
  const allLabel = isEn ? "All" : "Tous";
  const [activeCategory, setActiveCategory] = useState<string>(allLabel);

  const categories = [
    allLabel,
    ...Array.from(
      new Set(items.map((p) => p.category?.trim()).filter((c): c is string => Boolean(c))),
    ),
  ];

  const filtered =
    activeCategory === allLabel
      ? items
      : items.filter((p) => p.category === activeCategory);

  const showFeatured = activeCategory === allLabel;
  const featured = showFeatured ? filtered.filter((p) => p.featured) : [];
  const regular = showFeatured
    ? filtered.filter((p) => !p.featured)
    : filtered;

  const nextSteps = nextStepsByLocale[locale];

  return (
    <>
      <PortfolioStats stats={stats} />

      {categories.length > 1 && (
      <div
        className="mb-12 flex flex-wrap justify-center gap-2"
        role="group"
        aria-label={isEn ? "Filter by category" : "Filtrer par catégorie"}
      >
        {categories.map((cat) => (
          <CategoryFilterButton
            key={cat}
            label={cat}
            pressed={activeCategory === cat}
            onSelect={() => setActiveCategory(cat)}
          />
        ))}
      </div>
      )}

      {featured.length > 0 && (
        <div className="mb-8 grid gap-8 md:grid-cols-2">
          {featured.map((project, i) => (
            <RealisationCard
              key={project.id}
              project={project}
              index={i}
              large
              locale={locale}
            />
          ))}
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {regular.map((project, i) => (
          <RealisationCard
            key={project.id}
            project={project}
            index={i + featured.length}
            locale={locale}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-16 text-center text-gray-text">
          {isEn
            ? "No projects in this category yet."
            : "Aucun projet dans cette catégorie pour le moment."}
        </p>
      )}

      <section className="mt-16 rounded-3xl border border-gray/60 bg-gradient-to-br from-gray-light via-white to-primary-light/20 p-8 md:p-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {isEn ? "Next step" : "Prochaine étape"}
          </p>
          <h2 className="mt-3 text-2xl font-bold text-foreground md:text-3xl">
            {isEn ? "Inspired by our work?" : "Inspiré par nos réalisations ?"}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-text md:text-base">
            {isEn
              ? "Choose the path that fits — quote, audit or a simple message."
              : "Choisissez le parcours adapté à votre situation — estimation, audit ou simple message."}
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {nextSteps.map((step) => {
            const Icon = step.icon;
            return (
              <Link
                key={step.href}
                href={step.href}
                className={cn(
                  "group flex h-full flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                  step.featured
                    ? "border-primary/30 ring-2 ring-primary/10"
                    : "border-gray/60 hover:border-primary/25",
                )}
              >
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl",
                    step.featured
                      ? "bg-primary text-white"
                      : "bg-primary-light text-primary",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-5 font-bold text-foreground">{step.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-text">
                  {step.description}
                </p>
                <span
                  className={cn(
                    "mt-6 inline-flex items-center gap-2 text-sm font-semibold transition-colors",
                    step.featured
                      ? "text-primary group-hover:text-primary-dark"
                      : "text-foreground group-hover:text-primary",
                  )}
                >
                  {step.cta}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
