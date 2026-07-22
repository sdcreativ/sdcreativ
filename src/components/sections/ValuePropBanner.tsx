import { Sparkles } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SITE_VALUE_PROP } from "@/lib/site-value-prop";

/** Bandeau d’accueil : proposition de valeur bien visible. */
export function ValuePropBanner() {
  return (
    <AnimatedSection className="relative overflow-hidden border-y border-primary/15 bg-gradient-to-r from-primary via-[#0a5f9e] to-primary">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.25), transparent 55%), radial-gradient(ellipse at 80% 50%, rgba(255,255,255,0.12), transparent 50%)",
        }}
        aria-hidden
      />
      <div className="container relative mx-auto px-4 py-8 md:px-6 md:py-10 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 text-center sm:flex-row sm:gap-4 sm:text-left">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm ring-1 ring-white/25">
            <Sparkles className="h-6 w-6" aria-hidden />
          </div>
          <p className="text-lg font-bold leading-snug tracking-tight text-white md:text-2xl md:leading-snug">
            {SITE_VALUE_PROP}
          </p>
        </div>
      </div>
    </AnimatedSection>
  );
}
