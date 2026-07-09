import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimatedSection, AnimatedCard } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getServiceHref, getServiceHubLinkLabel, getServices } from "@/lib/services";

export async function ServicesSection() {
  const services = await getServices();
  const itemsWithLinks = await Promise.all(
    services.map(async (service) => ({
      service,
      href: await getServiceHref(service),
      linkLabel: await getServiceHubLinkLabel(service),
    })),
  );

  return (
    <AnimatedSection className="bg-gray-light py-20 md:py-28" id="services">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Nos services"
          title="Des solutions digitales"
          highlight="adaptées à votre activité"
          className="mb-14"
        />

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {itemsWithLinks.map(({ service, href, linkLabel }, i) => {
            const Icon = service.icon;
            return (
              <AnimatedCard
                key={service.id}
                delay={i * 0.06}
                className="flex flex-col rounded-2xl bg-white p-8 shadow-sm transition-shadow hover:shadow-lg"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary-light">
                  <Icon className="h-7 w-7 text-primary" aria-hidden />
                </div>
                <h3 className="text-xl font-bold text-foreground">{service.title}</h3>
                <p className="mt-2 text-sm text-gray-text">{service.description}</p>
                <ul className="mt-5 flex-1 space-y-2">
                  {service.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-foreground/80"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={href}
                  className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary-dark"
                >
                  {linkLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </AnimatedCard>
            );
          })}
        </div>
      </div>
    </AnimatedSection>
  );
}
