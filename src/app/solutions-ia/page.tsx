import Link from "next/link";
import { CheckCircle2, Bot } from "lucide-react";
import { SitePageHero } from "@/components/ui/SitePageHero";
import { Button } from "@/components/ui/Button";
import { AccordionItem } from "@/components/ui/Accordion";
import { AnimatedSection, AnimatedCard } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FaqJsonLd } from "@/components/seo/JsonLd";
import { formatPriceFrom } from "@/lib/format";
import { getSolutionsIaContent } from "@/lib/solutions-ia-resolver";
import { createMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export const metadata = createMetadata({
  title: "Solutions IA",
  description:
    "Agents IA, chatbots, assistants WhatsApp et automatisation métier pour PME en Côte d'Ivoire. Cas d'usage, stack technique et processus SD CREATIV.",
  path: "/solutions-ia",
});

export default async function SolutionsIaPage() {
  const content = await getSolutionsIaContent();

  return (
    <>
      <FaqJsonLd items={content.faq} />
      <SitePageHero pageKey="solutions-ia" />

      <AnimatedSection className="border-b border-gray/40 bg-primary-light py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
              <Bot className="h-7 w-7" aria-hidden />
            </div>
            <h2 className="text-xl font-bold text-foreground md:text-2xl">
              {content.demoSection.title}
            </h2>
            <p className="mt-3 text-gray-text">{content.demoSection.description}</p>
            <p className="mt-4 text-sm font-semibold text-primary">{content.demoSection.hint}</p>
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
          <div className="grid gap-8 lg:grid-cols-3">
            {content.useCases.map((useCase, i) => {
              const Icon = useCase.icon;
              return (
                <AnimatedCard
                  key={useCase.id}
                  delay={i * 0.08}
                  className="rounded-2xl border border-gray/60 bg-white p-8 shadow-sm"
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
                    <Icon className="h-7 w-7 text-primary" aria-hidden />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{useCase.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-text">
                    {useCase.description}
                  </p>
                  <ul className="mt-5 space-y-2">
                    {useCase.benefits.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-foreground/85">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                        {b}
                      </li>
                    ))}
                  </ul>
                </AnimatedCard>
              );
            })}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="bg-gray-light py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <SectionHeading
            eyebrow={content.headings.stack.eyebrow}
            title={content.headings.stack.title}
            highlight={content.headings.stack.highlight}
            description={content.headings.stack.description}
            className="mb-14"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {content.stack.map((item, i) => (
              <AnimatedCard
                key={item.name}
                delay={i * 0.05}
                className="rounded-xl border border-gray/60 bg-white p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {item.category}
                </p>
                <h3 className="mt-1 font-bold text-foreground">{item.name}</h3>
                <p className="mt-2 text-sm text-gray-text">{item.description}</p>
              </AnimatedCard>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-6">
            {content.demoHighlights.map(({ icon: Icon, label, detail }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                <div>
                  <p className="text-sm font-bold text-foreground">{label}</p>
                  <p className="text-xs text-gray-text">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="bg-white py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <SectionHeading
            eyebrow={content.headings.process.eyebrow}
            title={content.headings.process.title}
            highlight={content.headings.process.highlight}
            className="mb-14"
          />
          <div className="mx-auto max-w-3xl space-y-6">
            {content.process.map((step, i) => (
              <AnimatedCard
                key={step.step}
                delay={i * 0.06}
                className="flex gap-5 rounded-2xl border border-gray/60 bg-gray-light/40 p-6"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {step.step}
                </span>
                <div>
                  <h3 className="font-bold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-text">{step.description}</p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="bg-gray-light py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <SectionHeading
            eyebrow={content.headings.packs.eyebrow}
            title={content.headings.packs.title}
            highlight={content.headings.packs.highlight}
            description={content.headings.packs.description}
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
                    Populaire
                  </span>
                )}
                <h3 className="text-xl font-bold text-foreground">{pack.name}</h3>
                <p className="mt-1 text-sm text-gray-text">{pack.tagline}</p>
                <p className="mt-4 text-xl font-semibold text-primary">
                  {formatPriceFrom(pack.priceFrom)}
                </p>
                <ul className="mt-6 flex-1 space-y-2">
                  {pack.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button href="/devis?type=agents-ia" className="mt-8 w-full justify-center">
                  Estimer mon projet
                </Button>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <section className="border-t border-gray/40 bg-white py-16 md:py-20">
        <div className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
          <h2 className="mb-8 text-2xl font-bold text-foreground">Questions fréquentes</h2>
          {content.faq.map((item) => (
            <AccordionItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </section>

      <section className="bg-dark py-16 text-center md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white md:text-3xl">{content.ctaSection.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">{content.ctaSection.description}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="/devis?type=agents-ia" size="lg">
              Configurateur de devis
            </Button>
            <Button href="/contact" variant="outline" size="lg">
              Nous contacter
            </Button>
          </div>
          <p className="mt-6 text-sm text-white/50">
            Article associé :{" "}
            <Link href="/blog/agents-ia-pme-cote-ivoire" className="text-primary-light hover:underline">
              Agents IA pour les PME en Côte d&apos;Ivoire →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
