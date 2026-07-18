import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, CheckCircle2, Clock } from "lucide-react";
import { SitePageHero } from "@/components/ui/SitePageHero";
import { Button } from "@/components/ui/Button";
import { AccordionItem } from "@/components/ui/Accordion";
import { AnimatedSection, AnimatedCard } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FaqJsonLd } from "@/components/seo/JsonLd";
import { getFormationsContent } from "@/lib/formations-resolver";
import { formatFcfa } from "@/lib/format";
import { isProxiedMediaUrl, resolveImageDisplayUrl } from "@/lib/image-url";
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
            className="mb-12"
          />

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {content.categories.map((category, i) => {
              const Icon = category.icon;
              const imageSrc = resolveImageDisplayUrl(category.image);
              return (
                <AnimatedCard key={category.id} delay={Math.min(i * 0.04, 0.28)}>
                  <a
                    href={`#${category.id}`}
                    className="group relative block overflow-hidden rounded-2xl bg-dark shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-xl"
                  >
                    <div className="relative aspect-[5/4] overflow-hidden">
                      <Image
                        src={imageSrc}
                        alt={category.imageAlt || category.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        priority={i < 3}
                        unoptimized={isProxiedMediaUrl(imageSrc)}
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-dark via-dark/55 to-transparent"
                        aria-hidden
                      />
                      <div className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm ring-1 ring-white/25">
                        <Icon className="h-5 w-5" aria-hidden />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary-light">
                          {category.courses.length}{" "}
                          {category.isServices ? "services" : "modules"}
                        </p>
                        <h3 className="mt-1 text-lg font-bold leading-snug text-white md:text-xl">
                          {category.title}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm text-white/75">
                          {category.description}
                        </p>
                        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                          Voir le programme
                          <ArrowDownRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
                        </span>
                      </div>
                    </div>
                  </a>
                </AnimatedCard>
              );
            })}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="border-t border-gray/40 bg-gray-light py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Programmes"
            title="Détail des"
            highlight="formations"
            description="Durées et tarifs indicatifs — devis personnalisé selon le format et le nombre de participants."
            className="mb-12"
          />

          <div className="space-y-10">
            {content.categories.map((category, i) => {
              const Icon = category.icon;
              const imageSrc = resolveImageDisplayUrl(category.image);
              return (
                <div key={category.id} id={category.id} className="scroll-mt-28">
                  <AnimatedCard
                    delay={Math.min(i * 0.03, 0.2)}
                    className="overflow-hidden rounded-2xl border border-gray/60 bg-white shadow-sm"
                  >
                    <div className="grid lg:grid-cols-[minmax(0,18rem)_1fr]">
                      <div className="relative min-h-[14rem] lg:min-h-full">
                        <Image
                          src={imageSrc}
                          alt={category.imageAlt || category.title}
                          fill
                          sizes="(max-width: 1024px) 100vw, 18rem"
                          className="object-cover"
                          unoptimized={isProxiedMediaUrl(imageSrc)}
                        />
                        <div
                          className="absolute inset-0 bg-gradient-to-t from-dark/50 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-dark/10"
                          aria-hidden
                        />
                      </div>
                      <div className="p-6 md:p-8">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-light">
                            <Icon className="h-6 w-6 text-primary" aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xl font-bold text-foreground md:text-2xl">
                              {category.title}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-gray-text md:text-base">
                              {category.description}
                            </p>
                          </div>
                        </div>
                        <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-primary">
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

      <section className="border-t border-gray/40 bg-white py-16 md:py-20">
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
