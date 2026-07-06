import Link from "next/link";
import { CheckCircle2, Bot } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { AccordionItem } from "@/components/ui/Accordion";
import { AnimatedSection, AnimatedCard } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FaqJsonLd } from "@/components/seo/JsonLd";
import {
  iaUseCases,
  iaStack,
  iaProcess,
  iaPacks,
  iaFaq,
  iaDemoHighlights,
} from "@/content/solutions-ia";
import { formatPriceFrom } from "@/lib/format";
import { createMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export const metadata = createMetadata({
  title: "Solutions IA",
  description:
    "Agents IA, chatbots, assistants WhatsApp et automatisation métier pour PME en Côte d'Ivoire. Cas d'usage, stack technique et processus SD CREATIV.",
  path: "/solutions-ia",
});

export default function SolutionsIaPage() {
  return (
    <>
      <FaqJsonLd items={[...iaFaq]} />
      <PageHero
        eyebrow="Intelligence artificielle"
        title="Solutions IA"
        highlight="sur mesure"
        description="Support client, qualification de leads, automatisation métier — nous concevons et déployons des agents intelligents adaptés au contexte ivoirien."
        breadcrumb={[
          { label: "Accueil", href: "/" },
          { label: "Solutions IA" },
        ]}
      />

      <AnimatedSection className="border-b border-gray/40 bg-primary-light py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
              <Bot className="h-7 w-7" aria-hidden />
            </div>
            <h2 className="text-xl font-bold text-foreground md:text-2xl">
              Démo live : testez notre assistant IA
            </h2>
            <p className="mt-3 text-gray-text">
              Le chatbot en bas à gauche de ce site est une démonstration concrète de notre
              savoir-faire. Posez-lui vos questions sur nos services, tarifs et délais.
            </p>
            <p className="mt-4 text-sm font-semibold text-primary">
              Cliquez sur « Assistant IA » pour l&apos;essayer →
            </p>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="bg-white py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Cas d'usage"
            title="Des agents IA"
            highlight="orientés résultats"
            className="mb-14"
          />
          <div className="grid gap-8 lg:grid-cols-3">
            {iaUseCases.map((useCase, i) => {
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
            eyebrow="Stack technique"
            title="Technologies"
            highlight="éprouvées"
            description="Nous sélectionnons les outils les plus adaptés à votre budget, vos contraintes de sécurité et votre écosystème existant."
            className="mb-14"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {iaStack.map((item, i) => (
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
            {iaDemoHighlights.map(({ icon: Icon, label, detail }) => (
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
            eyebrow="Notre méthode"
            title="Processus"
            highlight="en 5 étapes"
            className="mb-14"
          />
          <div className="mx-auto max-w-3xl space-y-6">
            {iaProcess.map((step, i) => (
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
            eyebrow="Packs indicatifs"
            title="Tarifs"
            highlight="en FCFA"
            description="Prix de départ HT. Chaque projet fait l'objet d'un devis personnalisé après audit."
            className="mb-14"
          />
          <div className="grid gap-8 lg:grid-cols-3">
            {iaPacks.map((pack, i) => (
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
                <p className="mt-4 text-2xl font-bold text-primary">
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
          {iaFaq.map((item) => (
            <AccordionItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </section>

      <section className="bg-dark py-16 text-center md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Prêt à déployer votre agent IA ?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">
            Discutons de votre cas d&apos;usage et obtenez un devis personnalisé en FCFA.
          </p>
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
