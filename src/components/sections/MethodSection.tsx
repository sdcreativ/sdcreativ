import { AnimatedSection, AnimatedCard } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getLucideIcon } from "@/lib/lucide-icon-map";
import { getSiteMethodSettings } from "@/lib/site-method-settings";

export async function MethodSection() {
  const { eyebrow, title, highlight, steps } = await getSiteMethodSettings();

  return (
    <AnimatedSection className="bg-dark py-20 md:py-28" id="methode">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          highlight={highlight}
          dark
          className="mb-16"
        />

        <div className="relative">
          <div
            className="absolute left-0 right-0 top-8 hidden h-0.5 bg-primary/30 lg:block"
            aria-hidden
          />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-7">
            {steps.map((step, i) => {
              const Icon = getLucideIcon(step.icon);
              return (
                <AnimatedCard key={step.number} delay={i * 0.07} className="relative text-center">
                  <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-dark">
                    <Icon className="h-6 w-6 text-primary-light" aria-hidden />
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {step.number.replace("0", "")}
                    </span>
                  </div>
                  <h3 className="font-bold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {step.description}
                  </p>
                </AnimatedCard>
              );
            })}
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}
