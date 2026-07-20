import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { enServices } from "@/i18n/en-content";
import { createMetadata } from "@/lib/metadata";
import { getServiceHref, getServices } from "@/lib/services";

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
  const items = await Promise.all(
    services.map(async (service) => ({
      service,
      href: await getServiceHref(service),
    })),
  );

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
        <div className="container mx-auto grid gap-6 px-4 md:grid-cols-2 md:px-6 lg:px-8">
          {items.length === 0 ? (
            <p className="col-span-full text-center text-sm text-gray-text">
              Services will appear here once published in the CRM.{" "}
              <Link href="/services" className="font-semibold text-primary hover:underline">
                See French version →
              </Link>
            </p>
          ) : (
            items.map(({ service, href }) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.id}
                  className="rounded-2xl border border-gray/60 bg-white p-8 shadow-sm"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
                    <Icon className="h-6 w-6 text-primary" aria-hidden />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{service.title}</h2>
                  <p className="mt-2 text-sm text-gray-text">{service.description}</p>
                  <Link
                    href={href}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    Learn more
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              );
            })
          )}
        </div>
        <p className="mt-12 text-center text-sm text-gray-text">
          Full French version:{" "}
          <Link href="/services" className="font-semibold text-primary hover:underline">
            /services →
          </Link>
        </p>
      </section>
    </>
  );
}
