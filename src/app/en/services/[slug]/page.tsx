import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { servicesEnById } from "@/i18n/public-en";
import { createMetadata } from "@/lib/metadata";
import { getService, getServices } from "@/lib/services";
import { SITE_VALUE_PROP } from "@/lib/site-value-prop";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

export async function generateStaticParams() {
  const services = await getServices();
  return services.map((s) => ({ slug: s.id }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const service = await getService(slug);
  const en = servicesEnById[slug];
  if (!service && !en) return {};

  return createMetadata({
    title: en?.title ?? service?.title ?? "Service",
    description: en?.description ?? service?.description ?? "",
    path: `/en/services/${slug}`,
    locale: "en",
  });
}

export default async function EnServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = await getService(slug);
  const en = servicesEnById[slug];

  if (!service && !en) notFound();

  const Icon = service?.icon;
  const title = en?.title ?? service!.title;
  const description = en?.description ?? service!.description;
  const features = en?.features ?? service?.features ?? [];

  return (
    <>
      <PageHero
        eyebrow="Services"
        title={title}
        description={description}
        breadcrumb={[
          { label: "Home", href: "/en" },
          { label: "Services", href: "/en/services" },
          { label: title },
        ]}
      />
      <section className="py-16 md:py-20">
        <div className="container mx-auto grid gap-12 px-4 lg:grid-cols-[1.1fr_0.9fr] md:px-6 lg:px-8">
          <div>
            {Icon ? (
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
                <Icon className="h-7 w-7" aria-hidden />
              </div>
            ) : null}
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              {SITE_VALUE_PROP}
            </p>
            <h2 className="mt-3 text-2xl font-bold text-foreground md:text-3xl">
              What you get
            </h2>
            <ul className="mt-6 space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-gray-text">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button href={`/en/devis?type=${encodeURIComponent(slug)}`} size="lg">
                Get a quote
              </Button>
              <Button href="/en/contact" variant="ghost" size="lg">
                Contact us
              </Button>
            </div>
          </div>
          <aside className="rounded-2xl border border-gray/60 bg-gray-light/40 p-8">
            <h3 className="text-lg font-bold text-foreground">Next steps</h3>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-gray-text">
              <li>Tell us about your goals and constraints.</li>
              <li>Receive a free custom quote within 24–48 business hours.</li>
              <li>Validate scope, timeline and kickoff together.</li>
            </ol>
            <Link
              href="/en/services"
              className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              All services
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
