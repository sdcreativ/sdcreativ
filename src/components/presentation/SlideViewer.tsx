"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PresentationSlide } from "@/lib/presentation-types";
import { cn } from "@/lib/utils";

type Props = {
  slide: PresentationSlide;
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  canPrevious: boolean;
  canNext: boolean;
};

export function SlideViewer({
  slide,
  index,
  total,
  onPrevious,
  onNext,
  canPrevious,
  canNext,
}: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 md:px-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
            Slide {index + 1} / {total}
          </p>
          <h2 className="truncate text-lg font-bold text-white md:text-xl">{slide.title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!canPrevious}
            className={cn(
              "rounded-xl border border-white/15 p-2.5 text-white transition-colors",
              canPrevious ? "hover:bg-white/10" : "cursor-not-allowed opacity-35",
            )}
            aria-label="Slide précédente"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className={cn(
              "rounded-xl border border-white/15 p-2.5 text-white transition-colors",
              canNext ? "hover:bg-white/10" : "cursor-not-allowed opacity-35",
            )}
            aria-label="Slide suivante"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-[#020617]">
        <Image
          src={slide.image}
          alt={slide.title}
          fill
          priority
          className="object-contain p-2 md:p-4"
          sizes="100vw"
        />
      </div>

      {slide.oralHint && (
        <div className="border-t border-white/10 bg-[#0b1628] px-4 py-4 md:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-light">
            Script oral
          </p>
          <p className="mt-1 text-sm leading-relaxed text-white/80 md:text-base">{slide.oralHint}</p>
        </div>
      )}
    </div>
  );
}
