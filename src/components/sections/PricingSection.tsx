import { Clock, Monitor, Headphones, Target } from "lucide-react";
import { AnimatedSection, AnimatedCard } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PricingPlanCard } from "@/components/sections/PricingPlanCard";
import { getPricingPlans, getPricingReassurance } from "@/lib/public-pricing-resolver";
import { SITE_VALUE_PROP, SITE_VALUE_PROP_EN } from "@/lib/site-value-prop";

const reassuranceIcons = [Clock, Monitor, Headphones, Target];

type Props = {
  locale?: "fr" | "en";
};

export async function PricingSection({ locale = "fr" }: Props) {
  const [pricingPlans, pricingReassurance] = await Promise.all([
    getPricingPlans(locale),
    getPricingReassurance(locale),
  ]);

  if (pricingPlans.length === 0) return null;

  return (
    <AnimatedSection className="bg-white py-20 md:py-28" id="tarifs">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          eyebrow={locale === "en" ? "Our plans" : "Nos offres"}
          title={locale === "en" ? "Choose the right" : "Choisissez la formule"}
          highlight={locale === "en" ? "package" : "adaptée"}
          className="mb-6"
        />
        <p className="mx-auto mb-14 max-w-2xl text-center text-base font-semibold text-primary md:text-lg">
          {locale === "en" ? SITE_VALUE_PROP_EN : SITE_VALUE_PROP}
        </p>

        <div className="grid gap-8 pt-3 md:grid-cols-2 lg:grid-cols-3">
          {pricingPlans.map((plan, i) => (
            <AnimatedCard key={plan.id} delay={i * 0.1} className="h-full">
              <PricingPlanCard plan={plan} locale={locale} />
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
