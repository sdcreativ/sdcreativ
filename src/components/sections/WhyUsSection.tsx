import { AnimatedSection, AnimatedCard } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { whyUsItems, whyUsIntro } from "@/content/why-us";

export function WhyUsSection() {
  return (
    <AnimatedSection className="bg-white py-20 md:py-28" id="pourquoi">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Pourquoi choisir SD CREATIV ?"
              title="Bien plus"
              highlight="qu'un site web."
              align="left"
            />
            <p className="mt-6 text-lg leading-relaxed text-gray-text">{whyUsIntro}</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {whyUsItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <AnimatedCard
                  key={item.title}
                  delay={i * 0.08}
                  className="rounded-2xl border border-gray bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
                    <Icon className="h-6 w-6 text-primary" aria-hidden />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-text">
                    {item.description}
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
