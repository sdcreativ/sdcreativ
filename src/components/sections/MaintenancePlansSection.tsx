import { Check } from "lucide-react";
import { AnimatedSection, AnimatedCard } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { maintenancePlans } from "@/content/maintenance-plans";
import { formatFcfa } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MaintenancePlansSection() {
  return (
    <AnimatedSection className="bg-white py-20 md:py-28">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Formules récurrentes"
          title="Choisissez votre"
          highlight="niveau de sérénité"
          description="Paiement mensuel ou annuel en FCFA. L'abonnement annuel inclut 2 mois offerts."
          className="mb-14"
        />

        <div className="grid gap-8 lg:grid-cols-3">
          {maintenancePlans.map((plan, i) => (
            <AnimatedCard
              key={plan.id}
              delay={i * 0.1}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm transition-shadow hover:shadow-lg",
                plan.highlighted && "border-primary shadow-md ring-2 ring-primary/20",
                "border-t-4 border-t-primary",
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white">
                  Recommandé
                </span>
              )}

              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                SLA {plan.sla}
              </p>
              <h3 className="mt-2 text-2xl font-bold uppercase text-foreground">{plan.name}</h3>
              <p className="mt-1 text-gray-text">{plan.tagline}</p>

              <div className="mt-6 space-y-1">
                <p className="text-2xl font-bold text-primary">
                  {formatFcfa(plan.priceMonthly)} FCFA
                  <span className="text-base font-normal text-gray-text"> / mois</span>
                </p>
                <p className="text-sm text-gray-text">
                  ou {formatFcfa(plan.priceAnnual)} FCFA / an HT
                </p>
              </div>

              <p className="mt-4 rounded-lg bg-primary-light px-3 py-2 text-sm font-medium text-foreground">
                Réponse : {plan.responseTime}
              </p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                href={`/devis?type=maintenance`}
                variant="primary"
                className="mt-8 w-full justify-center"
              >
                Demander un devis
              </Button>
            </AnimatedCard>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
