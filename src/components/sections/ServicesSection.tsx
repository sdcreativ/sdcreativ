import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimatedSection, AnimatedCard } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { servicesEnById } from "@/i18n/public-en";
import { getServiceHref, getServiceHubLinkLabel, getServices } from "@/lib/services";

type Props = { locale?: "fr" | "en" };

export async function ServicesSection({ locale = "fr" }: Props) {
  const services = await getServices();
  if (services.length === 0) return null;

  const isEn = locale === "en";

  const itemsWithLinks = await Promise.all(
    services.map(async (service) => {
      const en = servicesEnById[service.id];
      const href = isEn
        ? `/en/services/${service.id}`
        : await getServiceHref(service);
      const linkLabel = isEn
        ? en?.detailLabel ?? "View details"
        : await getServiceHubLinkLabel(service);
      return {
        service,
        href,
        linkLabel,
        title: isEn && en ? en.title : service.title,
        description: isEn && en ? en.description : service.description,
        features: isEn && en ? en.features : service.features,
      };
    }),
  );

  return (
    <AnimatedSection className="bg-gray-light py-20 md:py-28" id="services">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          eyebrow={isEn ? "Our services" : "Nos services"}
          title={isEn ? "Digital solutions" : "Des solutions digitales"}
          highlight={isEn ? "for your business" : "adaptées à votre activité"}
          className="mb-14"
        />

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {itemsWithLinks.map(({ service, href, linkLabel, title, description, features }, i) => {
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
                <h3 className="text-xl font-bold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-gray-text">{description}</p>
                <ul className="mt-5 flex-1 space-y-2">
                  {features.map((feature) => (
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
