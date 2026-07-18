import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formationsPageCopyEn } from "@/content/formations";
import { getFormationsContent } from "@/lib/formations-resolver";
import { formatFcfa } from "@/lib/format";
import { enTraining } from "@/i18n/en-content";
import { createMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Professional training",
  description:
    "SD CREATIV training catalog: web & mobile development, AI, cybersecurity, DevOps, databases, digital marketing and more. Abidjan and remote.",
  path: "/en/training",
  locale: "en",
});

export default async function EnTrainingPage() {
  const content = await getFormationsContent();

  return (
    <>
      <PageHero
        eyebrow={formationsPageCopyEn.hero.eyebrow}
        title={enTraining.title}
        highlight={enTraining.highlight}
        description={enTraining.description}
        breadcrumb={[{ label: "Home", href: "/en" }, { label: "Training" }]}
      />

      <section className="border-b border-gray/40 bg-primary-light py-12 md:py-16">
        <div className="container mx-auto max-w-3xl px-4 text-center md:px-6 lg:px-8">
          <p className="text-gray-text">{formationsPageCopyEn.intro}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/en/contact" size="lg">
              {enTraining.cta}
            </Button>
            <Button href="/formations" variant="ghost" size="lg">
              {enTraining.viewFr}
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Catalog"
            title="Training"
            highlight="domains"
            description="Overview of our domains with indicative durations and prices. Full details on the French page."
            className="mb-12"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {content.categories.map((category) => {
              const Icon = category.icon;
              return (
                <article
                  key={category.id}
                  className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light">
                    <Icon className="h-6 w-6 text-primary" aria-hidden />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">{category.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-text">
                    {category.description}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {category.courses.slice(0, 4).map((course) => (
                      <li key={course.title} className="text-sm text-foreground/80">
                        <div className="flex items-start gap-2">
                          <CheckCircle2
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                            aria-hidden
                          />
                          <div>
                            <p>{course.title}</p>
                            {(course.duration ||
                              (course.price != null && course.price > 0)) && (
                              <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-gray-text">
                                {course.duration ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3" aria-hidden />
                                    {course.duration}
                                  </span>
                                ) : null}
                                {course.price != null && course.price > 0 ? (
                                  <span className="font-semibold text-primary">
                                    {formatFcfa(course.price)} FCFA
                                  </span>
                                ) : null}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                    {category.courses.length > 4 && (
                      <li className="text-xs font-semibold text-primary">
                        +{category.courses.length - 4} more
                      </li>
                    )}
                  </ul>
                </article>
              );
            })}
          </div>
          <p className="mt-10 text-center text-sm text-gray-text">
            Full French catalog:{" "}
            <Link href="/formations" className="font-semibold text-primary hover:underline">
              /formations →
            </Link>
          </p>
        </div>
      </section>

      <section className="bg-dark py-16 text-center md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Need a tailored training plan?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">
            Tell us your goals, audience and timeline — we build the right program.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="/en/contact" size="lg">
              {enTraining.cta}
            </Button>
            <Button href="/en/book" variant="outline" size="lg">
              Book a call
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
