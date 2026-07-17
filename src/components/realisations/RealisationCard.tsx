"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Calendar, Clock, MapPin, TrendingUp } from "lucide-react";
import { AnimatedCard } from "@/components/ui/AnimatedSection";
import type { Realisation } from "@/content/realisations";
import { isProxiedMediaUrl, resolveImageDisplayUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

type RealisationCardProps = {
  project: Realisation;
  index: number;
  large?: boolean;
};

export function RealisationCard({ project, index, large }: RealisationCardProps) {
  const href = `/realisations/${project.id}`;
  const imageSrc = resolveImageDisplayUrl(project.image);

  return (
    <AnimatedCard
      delay={index * 0.06}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-gray/60 bg-white shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/10",
        large && "md:col-span-2",
      )}
    >
      <Link href={href} className="block">
        <div
          className={cn(
            "relative overflow-hidden bg-dark",
            large ? "aspect-video" : "aspect-[4/3]",
          )}
        >
          <Image
            src={imageSrc}
            alt={project.imageAlt}
            fill
            unoptimized={isProxiedMediaUrl(imageSrc)}
            sizes={large ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 100vw, 33vw"}
            className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-dark/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {project.metric && (
            <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur-sm">
              <TrendingUp className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span className="text-sm font-bold text-foreground">{project.metric.value}</span>
              <span className="hidden text-xs text-gray-text sm:inline">{project.metric.label}</span>
            </div>
          )}

          <div className="absolute inset-0 z-10 flex items-end justify-center pb-6 opacity-0 transition-all duration-300 group-hover:opacity-100">
            <span className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-foreground shadow-xl">
              Voir le projet
              <ArrowUpRight className="h-4 w-4 text-primary" aria-hidden />
            </span>
          </div>
        </div>

        <div className={cn("p-6", large && "md:p-8")}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-text">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden />
              {project.location}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" aria-hidden />
              {project.year}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden />
              {project.duration}
            </span>
          </div>

          <span
            className="mt-3 inline-block text-xs font-bold uppercase tracking-widest"
            style={{ color: project.accent }}
          >
            {project.category}
          </span>

          <h2
            className={cn(
              "mt-1 font-bold text-foreground transition-colors group-hover:text-primary",
              large ? "text-2xl md:text-3xl" : "text-xl",
            )}
          >
            {project.title}
          </h2>

          <p className="mt-0.5 text-sm font-medium text-foreground/60">
            {project.client} · {project.sector}
          </p>

          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-text">
            {project.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {project.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-gray bg-gray-light/50 px-3 py-1 text-xs font-medium text-foreground/70"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </AnimatedCard>
  );
}
