"use client";

import { useState } from "react";
import { RealisationCard } from "@/components/realisations/RealisationCard";
import { PortfolioStats } from "@/components/realisations/PortfolioStats";
import { Button } from "@/components/ui/Button";
import {
  realisations as staticRealisations,
  realisationCategories,
  type Realisation,
} from "@/content/realisations";
import { useWhatsappUrl } from "@/components/site/SitePublicProvider";
import { cn } from "@/lib/utils";
import { MessageCircle } from "lucide-react";

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

  if (pressed) {
    return (
      <button type="button" onClick={onSelect} className={className} aria-pressed="true">
        {label}
      </button>
    );
  }

  return (
    <button type="button" onClick={onSelect} className={className} aria-pressed="false">
      {label}
    </button>
  );
}

type Props = {
  items?: Realisation[];
};

export function RealisationsGrid({ items = staticRealisations }: Props) {
  const waUrl = useWhatsappUrl();
  const [activeCategory, setActiveCategory] = useState<string>("Tous");

  const filtered =
    activeCategory === "Tous"
      ? items
      : items.filter((p) => p.category === activeCategory);

  const showFeatured = activeCategory === "Tous";
  const featured = showFeatured ? filtered.filter((p) => p.featured) : [];
  const regular = showFeatured
    ? filtered.filter((p) => !p.featured)
    : filtered;

  return (
    <>
      <PortfolioStats />

      <div className="mb-12 flex flex-wrap justify-center gap-2" role="group" aria-label="Filtrer par catégorie">
        {realisationCategories.map((cat) => (
          <CategoryFilterButton
            key={cat}
            label={cat}
            pressed={activeCategory === cat}
            onSelect={() => setActiveCategory(cat)}
          />
        ))}
      </div>

      {featured.length > 0 && (
        <div className="mb-8 grid gap-8 md:grid-cols-2">
          {featured.map((project, i) => (
            <RealisationCard key={project.id} project={project} index={i} large />
          ))}
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {regular.map((project, i) => (
          <RealisationCard
            key={project.id}
            project={project}
            index={i + featured.length}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-16 text-center text-gray-text">
          Aucun projet dans cette catégorie pour le moment.
        </p>
      )}

      <div className="relative mt-16 overflow-hidden rounded-2xl bg-dark p-10 text-center md:p-14">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,114,181,0.15),transparent_70%)]" />
        <div className="relative">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Votre projet pourrait être le prochain
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">
            Contactez-nous pour discuter de votre site web et obtenir un devis personnalisé.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="/contact" size="lg">
              Démarrer mon projet
            </Button>
            <Button href={waUrl} external variant="outline" size="lg">
              <MessageCircle className="h-4 w-4 text-green-400" aria-hidden />
              Parler sur WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
