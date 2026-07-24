import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { enServices } from "@/i18n/en-content";
import { servicesEnById } from "@/i18n/public-en";
import { createMetadata } from "@/lib/metadata";
import { getServices } from "@/lib/services";

export const revalidate = 300;

export const metadata = createMetadata({
  title: "Services",
  description:
    "Showcase websites, e-commerce, mobile apps, AI agents, DevOps, cloud, local SEO and maintenance for your business.",
  path: "/en/services",
  locale: "en",
});

export default async function EnServicesPage() {
  const services = await getServices();

  return (
    <>
      <PageHero
        eyebrow="Services"
        title={enServices.title}
        highlight={enServices.highlight}
        description={enServices.description}
        breadcrumb={[
          { label: "Home", href: "/en" },
          { label: "Services" },
        ]}
      />
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            {services.length === 0 ? (
              <p className="col-span-full text-center text-sm text-gray-text">
                Services will appear here once published in the CRM.{" "}
                <Link href="/en/devis" className="font-semibold text-primary hover:underline">
                  Request a quote →
                </Link>
              </p>
            ) : (
              services.map((service) => {
                const Icon = service.icon;
                const en = servicesEnById[service.id];
                const title = en?.title ?? service.title;
                const description = en?.description ?? service.description;
                const features = en?.features ?? service.features;
                const quoteHref = `/en/devis?type=${encodeURIComponent(service.id)}`;
                const detailHref = `/en/services/${service.id}`;

                return (
                  <article
                    key={service.id}
                    className="flex flex-col rounded-2xl border border-gray/60 bg-white p-8 shadow-sm"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
                      <Icon className="h-6 w-6 text-primary" aria-hidden />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">{title}</h2>
                    <p className="mt-2 text-sm text-gray-text">{description}</p>
                    {features.length > 0 && (
                      <ul className="mt-4 space-y-1.5 text-sm text-gray-text">
                        {features.slice(0, 5).map((feature) => (
                          <li key={feature}>• {feature}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Button href={quoteHref} size="sm">
                        {enServices.ctaQuote}
                      </Button>
                      <Link
                        href={detailHref}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                      >
                        {enServices.ctaDetails}
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </section>
    </>
  );
}
