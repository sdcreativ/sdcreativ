import { AnimatedSection, AnimatedCard } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getLucideIcon } from "@/lib/lucide-icon-map";
import { getSiteWhyUsSettings } from "@/lib/site-why-us-settings";

export async function WhyUsSection() {
  const { eyebrow, title, highlight, intro, items } = await getSiteWhyUsSettings();

  return (
    <AnimatedSection className="bg-white py-20 md:py-28" id="pourquoi">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow={eyebrow}
              title={title}
              highlight={highlight}
              align="left"
            />
            <p className="mt-6 text-lg leading-relaxed text-gray-text">{intro}</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {items.map((item, i) => {
              const Icon = getLucideIcon(item.icon);
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
