import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { enServices } from "@/i18n/en-content";
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
          <p className="mx-auto mb-10 max-w-3xl rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-center text-sm text-gray-text">
            {enServices.banner}
          </p>

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
                const quoteHref = `/en/devis?type=${encodeURIComponent(service.id)}`;
                const frDetailHref = service.detailHref ?? `/services/${service.id}`;

                return (
                  <div
                    key={service.id}
                    className="flex flex-col rounded-2xl border border-gray/60 bg-white p-8 shadow-sm"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
                      <Icon className="h-6 w-6 text-primary" aria-hidden />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">{service.title}</h2>
                    <p className="mt-2 flex-1 text-sm text-gray-text">{service.description}</p>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Button href={quoteHref} size="sm">
                        {enServices.ctaQuote}
                      </Button>
                      <Link
                        href={frDetailHref}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-gray-text hover:text-primary hover:underline"
                      >
                        {enServices.ctaDetailsFr}
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </>
  );
}
