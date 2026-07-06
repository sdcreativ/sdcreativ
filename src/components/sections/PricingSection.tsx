import { Check, Clock, Monitor, Headphones, Target } from "lucide-react";
import { AnimatedSection, AnimatedCard } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { pricingPlans, pricingReassurance } from "@/content/pricing";
import { formatPriceFrom } from "@/lib/format";
import { cn } from "@/lib/utils";

const reassuranceIcons = [Clock, Monitor, Headphones, Target];

export function PricingSection() {
  return (
    <AnimatedSection className="bg-white py-20 md:py-28" id="tarifs">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Nos offres"
          title="Choisissez la formule"
          highlight="adaptée"
          className="mb-14"
        />

        <div className="grid gap-8 lg:grid-cols-3">
          {pricingPlans.map((plan, i) => (
            <AnimatedCard
              key={plan.id}
              delay={i * 0.1}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm transition-shadow hover:shadow-lg",
                plan.highlighted && "border-primary shadow-md ring-2 ring-primary/20",
                plan.variant === "accent"
                  ? "border-t-4 border-t-accent"
                  : "border-t-4 border-t-primary",
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white">
                  Populaire
                </span>
              )}
              <h3 className="text-2xl font-bold uppercase text-foreground">{plan.name}</h3>
              <p className="mt-1 text-gray-text">{plan.tagline}</p>
              <p
                className={cn(
                  "mt-4 text-2xl font-bold",
                  plan.variant === "accent" ? "text-accent" : "text-primary",
                )}
              >
                {formatPriceFrom(plan.priceFrom)}
              </p>
              {plan.priceNote && (
                <p className="mt-1 text-xs text-gray-text">{plan.priceNote}</p>
              )}
              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        plan.variant === "accent" ? "text-accent" : "text-primary",
                      )}
                      aria-hidden
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                href="/devis"
                variant={plan.variant === "accent" ? "accent" : "primary"}
                className="mt-8 w-full justify-center"
              >
                Estimer en FCFA
              </Button>
            </AnimatedCard>
          ))}
        </div>

        <div className="mt-12 grid gap-4 rounded-2xl bg-primary-light p-6 sm:grid-cols-2 lg:grid-cols-4 lg:p-8">
          {pricingReassurance.map((item, i) => {
            const Icon = reassuranceIcons[i] ?? Clock;
            return (
              <div key={item.label} className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white">
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                </div>
                <div>
                  <p className="font-bold text-foreground">{item.label}</p>
                  <p className="text-sm text-gray-text">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AnimatedSection>
  );
}
