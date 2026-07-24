"use client";

import { useState } from "react";
import { Star, Quote } from "lucide-react";
import type { Testimonial } from "@/content/testimonials";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  testimonials: Testimonial[];
  locale?: "fr" | "en";
};

export function TestimonialsCarousel({ testimonials, locale = "fr" }: Props) {
  const [active, setActive] = useState(0);
  const isEn = locale === "en";

  if (testimonials.length === 0) return null;

  const safeActive = Math.min(active, testimonials.length - 1);
  const current = testimonials[safeActive]!;

  return (
    <AnimatedSection className="bg-gray-light py-20 md:py-28" id="temoignages">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          eyebrow={isEn ? "Testimonials" : "Témoignages"}
          title={isEn ? "Trusted by" : "Ils nous font"}
          highlight={isEn ? "growing teams" : "confiance"}
          className="mb-14"
        />

        <div className="relative mx-auto max-w-4xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
              className="relative rounded-2xl bg-white p-8 shadow-sm md:p-12"
            >
              <Quote
                className="absolute right-8 top-8 h-16 w-16 text-primary/10"
                aria-hidden
              />
              <div className="mb-4 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-accent text-accent"
                    aria-hidden
                  />
                ))}
              </div>
              <blockquote className="text-lg italic leading-relaxed text-foreground/90 md:text-xl">
                &ldquo;{current.quote}&rdquo;
              </blockquote>
              <footer className="mt-6">
                <cite className="not-italic">
                  <span className="font-bold text-foreground">{current.author}</span>
                  <span className="text-gray-text">
                    {" "}
                    — {current.role}, {current.company}
                  </span>
                </cite>
              </footer>
            </motion.div>
          </AnimatePresence>

          {testimonials.length > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {testimonials.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(i)}
                  className={cn(
                    "h-2.5 rounded-full transition-all duration-300",
                    safeActive === i ? "w-8 bg-primary" : "w-2.5 bg-gray hover:bg-primary/50",
                  )}
                  aria-label={isEn ? `Testimonial ${i + 1}` : `Témoignage ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-10 hidden gap-6 md:grid md:grid-cols-3">
          {testimonials.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-3 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-accent text-accent" aria-hidden />
                ))}
              </div>
              <p className="text-sm italic leading-relaxed text-foreground/80">
                &ldquo;{item.quote}&rdquo;
              </p>
              <p className="mt-4 text-sm font-bold">{item.author}</p>
              <p className="text-xs text-gray-text">
                {item.role}, {item.company}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
