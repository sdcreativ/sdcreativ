import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { PRICE_ON_REQUEST_LABEL_EN } from "@/lib/format";
import { getFormationsContent } from "@/lib/formations-resolver";
import { trainingCatalogEn } from "@/i18n/public-en";
import { createMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

export async function generateStaticParams() {
  const content = await getFormationsContent();
  return content.categories.map((c) => ({ slug: c.id }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const content = await getFormationsContent();
  const category = content.categories.find((c) => c.id === slug);
  const en = trainingCatalogEn[slug];
  if (!category && !en) return {};

  return createMetadata({
    title: en?.title ?? category?.title ?? "Training",
    description: en?.description ?? category?.description ?? "",
    path: `/en/training/${slug}`,
    locale: "en",
  });
}

export default async function EnTrainingDetailPage({ params }: Props) {
  const { slug } = await params;
  const content = await getFormationsContent();
  const category = content.categories.find((c) => c.id === slug);
  if (!category) notFound();

  const en = trainingCatalogEn[slug];
  const title = en?.title ?? category.title;
  const description = en?.description ?? category.description;

  return (
    <>
      <PageHero
        eyebrow="Training"
        title={title}
        description={description}
        breadcrumb={[
          { label: "Home", href: "/en" },
          { label: "Training", href: "/en/training" },
          { label: title },
        ]}
      />
      <section className="py-12 md:py-16">
        <div className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
          <Link
            href="/en/training"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to catalog
          </Link>

          <p className="text-sm text-gray-text">
            Modules below list indicative durations. Every program is quoted to match your
            format and number of participants.
          </p>

          <ul className="mt-8 space-y-3">
            {category.courses.map((course) => (
              <li
                key={course.title}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray/60 bg-white px-5 py-4 shadow-sm"
              >
                <div>
                  <p className="font-semibold text-foreground">{course.title}</p>
                  {course.duration ? (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-gray-text">
                      <Clock className="h-3.5 w-3.5 text-primary" aria-hidden />
                      {course.duration}
                    </p>
                  ) : null}
                </div>
                <span className="text-sm font-semibold text-primary">
                  {PRICE_ON_REQUEST_LABEL_EN}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button href="/en/devis" size="lg">
              Request a quote
            </Button>
            <Button href="/en/contact" variant="ghost" size="lg">
              Contact us
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
