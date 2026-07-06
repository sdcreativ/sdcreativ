import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { AccordionItem } from "@/components/ui/Accordion";
import { FaqJsonLd } from "@/components/seo/JsonLd";
import { localSeoPages, type LocalSeoPage } from "@/content/local-seo";
import { createMetadata } from "@/lib/metadata";

type Props = { page: LocalSeoPage };

export function LocalSeoPageView({ page }: Props) {
  const crumbs = [
    { label: "Accueil", href: "/" },
    { label: page.metaTitle },
  ];

  return (
    <>
      <FaqJsonLd items={page.faq} />
      <PageHero
        eyebrow={page.eyebrow}
        title={page.title}
        highlight={page.highlight}
        description={page.description}
        breadcrumb={crumbs}
      />

      <section className="py-16 md:py-20">
        <div className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
          {page.sections.map((section) => (
            <div key={section.heading} className="mb-12">
              <h2 className="text-2xl font-bold text-foreground">{section.heading}</h2>
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 40)} className="mt-4 leading-relaxed text-gray-text">
                  {p}
                </p>
              ))}
            </div>
          ))}

          <div className="rounded-2xl bg-primary-light p-8">
            <h2 className="text-lg font-bold text-foreground">Pourquoi SD CREATIV ?</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {page.benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2 text-sm text-foreground/85">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-gray/40 bg-gray-light py-16 md:py-20">
        <div className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
          <h2 className="mb-8 text-2xl font-bold text-foreground">Questions fréquentes</h2>
          {page.faq.map((item) => (
            <AccordionItem
              key={item.question}
              question={item.question}
              answer={item.answer}
            />
          ))}
        </div>
      </section>

      <section className="py-16 text-center md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">Prêt à démarrer ?</h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-text">
            Obtenez une estimation instantanée ou contactez notre équipe pour un devis
            personnalisé gratuit.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="/devis" size="lg">
              Configurateur de devis
            </Button>
            <Button href="/contact" variant="ghost" size="lg">
              Nous contacter
            </Button>
          </div>
          <p className="mt-6 text-sm text-gray-text">
            <Link href="/audit-gratuit" className="text-primary hover:underline">
              Audit web gratuit →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}

export function createLocalSeoMetadata(page: LocalSeoPage) {
  return createMetadata({
    title: page.metaTitle,
    description: page.metaDescription,
    path: page.path,
  });
}

export function getLocalSeoStaticParams() {
  return localSeoPages.map((p) => ({ slug: p.slug }));
}
