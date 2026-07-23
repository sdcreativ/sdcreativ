import Link from "next/link";
import { Bot, CheckCircle2 } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { AccordionItem } from "@/components/ui/Accordion";
import { AnimatedSection, AnimatedCard } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FaqJsonLd } from "@/components/seo/JsonLd";
import { enSolutionsIa } from "@/i18n/en-content";
import { formatPriceFrom, hasPublicPrice } from "@/lib/format";
import { getSolutionsIaContent } from "@/lib/solutions-ia-resolver";
import { createMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export const metadata = createMetadata({
  title: "AI solutions",
  description:
    "AI agents, chatbots, WhatsApp assistants and business automation for SMEs in Côte d'Ivoire. Use cases, packages and process from SD CREATIV.",
  path: "/en/solutions-ia",
  locale: "en",
});

export default async function EnSolutionsIaPage() {
  const content = await getSolutionsIaContent();

  return (
    <>
      <FaqJsonLd items={content.faq} />
      <PageHero
        eyebrow="AI"
        title={enSolutionsIa.title}
        highlight={enSolutionsIa.highlight}
        description={enSolutionsIa.description}
        breadcrumb={[
          { label: "Home", href: "/en" },
          { label: "AI solutions" },
        ]}
      />

      <AnimatedSection className="border-b border-gray/40 bg-primary-light py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
              <Bot className="h-7 w-7" aria-hidden />
            </div>
            <h2 className="text-xl font-bold text-foreground md:text-2xl">
              {enSolutionsIa.demoTitle}
            </h2>
            <p className="mt-3 text-gray-text">{enSolutionsIa.demoDescription}</p>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="bg-white py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <SectionHeading
            eyebrow={content.headings.useCases.eyebrow}
            title={content.headings.useCases.title}
            highlight={content.headings.useCases.highlight}
            className="mb-14"
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {content.useCases.map((useCase, i) => {
              const Icon = useCase.icon;
              return (
                <AnimatedCard
                  key={useCase.id}
                  delay={i * 0.08}
                  className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{useCase.title}</h3>
                  <p className="mt-2 text-sm text-gray-text">{useCase.description}</p>
                </AnimatedCard>
              );
            })}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="border-t border-gray/40 bg-gray-light/40 py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <SectionHeading
            eyebrow={enSolutionsIa.packsTitle}
            title={enSolutionsIa.packsTitle}
            highlight={enSolutionsIa.packsHighlight}
            className="mb-14"
          />
          <div className="grid gap-8 lg:grid-cols-3">
            {content.packs.map((pack, i) => (
              <AnimatedCard
                key={pack.id}
                delay={i * 0.1}
                className={cn(
                  "flex flex-col rounded-2xl border bg-white p-8 shadow-sm",
                  pack.highlighted && "border-primary ring-2 ring-primary/20",
                )}
              >
                {pack.highlighted && (
                  <span className="mb-3 w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                    Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-foreground">{pack.name}</h3>
                <p className="mt-1 text-sm text-gray-text">{pack.tagline}</p>
                <p className="mt-4 text-xl font-semibold text-primary">
                  {hasPublicPrice(pack.priceFrom)
                    ? formatPriceFrom(pack.priceFrom)
                    : "Free custom quote"}
                </p>
                <ul className="mt-6 flex-1 space-y-2">
                  {pack.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button href="/en/devis?type=agents-ia" className="mt-8 w-full justify-center">
                  {enSolutionsIa.cta}
                </Button>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <section className="border-t border-gray/40 bg-white py-16 md:py-20">
        <div className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
          <h2 className="mb-8 text-2xl font-bold text-foreground">{enSolutionsIa.faqTitle}</h2>
          {content.faq.map((item) => (
            <AccordionItem
              key={item.question}
              question={item.question}
              answer={item.answer}
            />
          ))}
          <p className="mt-10 text-center text-sm text-gray-text">
            <Link href="/solutions-ia" className="font-semibold text-primary hover:underline">
              {enSolutionsIa.viewFr}
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
