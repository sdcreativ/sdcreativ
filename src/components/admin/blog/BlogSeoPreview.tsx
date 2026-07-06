"use client";

import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  slug: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
};

function counterClass(length: number, max: number): string {
  if (length > max) return "text-red-600 font-semibold";
  if (length > max * 0.9) return "text-amber-600";
  return "text-gray-text";
}

export function BlogSeoPreview({
  title,
  slug,
  excerpt,
  metaTitle,
  metaDescription,
}: Props) {
  const displayTitle = metaTitle.trim() || title.trim() || "Titre de l'article";
  const displayDescription =
    metaDescription.trim() ||
    excerpt.trim() ||
    "Ajoutez un extrait ou une meta description pour compléter l'aperçu.";
  const url = `${SITE.url}/blog/${slug || "votre-slug"}`;

  return (
    <div className="rounded-xl border border-gray/50 bg-white p-4">
      <p className="text-xs font-medium text-gray-text">Aperçu dans Google</p>
      <div className="mt-3 space-y-0.5 rounded-lg bg-gray-light/60 p-3">
        <p className="truncate text-xs text-[#202124]">{SITE.name}</p>
        <p className="truncate text-[11px] text-[#006621]">{url}</p>
        <p className="line-clamp-1 text-base leading-snug text-[#1a0dab]">{displayTitle}</p>
        <p className="line-clamp-2 text-xs leading-relaxed text-[#4d5156]">
          {displayDescription}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className={counterClass(displayTitle.length, 60)}>
          Titre : {displayTitle.length}/60
        </span>
        <span className={counterClass(displayDescription.length, 160)}>
          Description : {displayDescription.length}/160
        </span>
      </div>
    </div>
  );
}

export function CharCounter({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  return (
    <span className={cn("text-xs tabular-nums", counterClass(value, max), className)}>
      {value}/{max}
    </span>
  );
}
