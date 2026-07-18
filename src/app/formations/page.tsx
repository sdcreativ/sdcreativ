import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { SitePageHero } from "@/components/ui/SitePageHero";
import { Button } from "@/components/ui/Button";
import { AccordionItem } from "@/components/ui/Accordion";
import { AnimatedSection, AnimatedCard } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FaqJsonLd } from "@/components/seo/JsonLd";
import { getFormationsContent } from "@/lib/formations-resolver";
import { formatFcfa } from "@/lib/format";
import { createMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Formations professionnelles",
  description:
    "Catalogue de formations SD CREATIV : développement web & mobile, IA, cybersécurité, DevOps, bases de données, Rust, bureautique, marketing digital et plus. Abidjan et distanciel.",
  path: "/formations",
});

export default async function FormationsPage() {
  const content = await getFormationsContent();

  return (
    <>
      <FaqJsonLd items={content.faq} />
      <SitePageHero pageKey="formations" />

      <AnimatedSection className="border-b border-gray/40 bg-primary-light py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <SectionHeading
            eyebrow={content.intro.eyebrow}
            title={content.intro.title}
            highlight={content.intro.highlight}
            description={content.intro.description}
            className="mb-10"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {content.highlights.map((item, i) => {
              const Icon = item.icon;
              return (
                <AnimatedCard
                  key={item.title}
                  delay={i * 0.06}
                  className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm"
                >
                  <Icon className="mb-3 h-7 w-7 text-primary" aria-hidden />
                  <h3 className="font-bold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-text">
                    {item.description}
                  </p>
                </AnimatedCard>
              );
            })}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="bg-white py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <SectionHeading
            eyebrow={content.catalog.eyebrow}
            title={content.catalog.title}
            highlight={content.catalog.highlight}
            description={content.catalog.description}
            className="mb-10"
          />
          <nav
            aria-label="Domaines de formation"
            className="mb-14 flex flex-wrap justify-center gap-2"
          >
            {content.categories.map((cat) => (
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className="rounded-full border border-gray/60 bg-gray-light/50 px-3.5 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:border-primary hover:bg-primary-light hover:text-primary"
              >
                {cat.title}
              </a>
            ))}
          </nav>

          <div className="space-y-10">
            {content.categories.map((category, i) => {
              const Icon = category.icon;
              return (
                <div key={category.id} id={category.id} className="scroll-mt-28">
                  <AnimatedCard
                    delay={Math.min(i * 0.04, 0.24)}
                    className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm md:p-8"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-start">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-light">
                        <Icon className="h-7 w-7 text-primary" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-bold text-foreground md:text-2xl">
                          {category.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-gray-text md:text-base">
                          {category.description}
                        </p>
                        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-primary">
                          {category.isServices ? "Nos services" : "Formations proposées"}
                        </p>
                        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                          {category.courses.map((course) => (
                            <li
                              key={course.title}
                              className="flex items-start gap-2 rounded-xl border border-gray/40 bg-gray-light/30 px-3 py-2.5 text-sm"
                            >
                              <CheckCircle2
                                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                                aria-hidden
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground/90">{course.title}</p>
                                {(course.duration ||
                                  (course.price != null && course.price > 0)) && (
                                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-text">
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
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AnimatedCard>
                </div>
              );
            })}
          </div>
        </div>
      </AnimatedSection>

      <section className="border-t border-gray/40 bg-gray-light py-16 md:py-20">
        <div className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
          <h2 className="mb-8 text-2xl font-bold text-foreground">{content.faqHeading}</h2>
          {content.faq.map((item) => (
            <AccordionItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </section>

      <section className="bg-dark py-16 text-center md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white md:text-3xl">{content.cta.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">{content.cta.description}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="/devis" size="lg">
              {content.cta.primary}
            </Button>
            <Button href="/rendez-vous" variant="outline" size="lg">
              {content.cta.secondary}
            </Button>
          </div>
          <p className="mt-6 text-sm text-white/50">
            Ou{" "}
            <Link href="/contact" className="text-primary-light hover:underline">
              contactez-nous directement →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
