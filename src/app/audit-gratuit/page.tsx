import Link from "next/link";
import { CheckCircle2, Search, Gauge, Smartphone, Shield } from "lucide-react";
import { SitePageHero } from "@/components/ui/SitePageHero";
import { Button } from "@/components/ui/Button";
import { ContactForm } from "@/components/forms/ContactForm";
import { FaqJsonLd } from "@/components/seo/JsonLd";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Audit web gratuit",
  description:
    "Audit gratuit de votre site web : performance, SEO, mobile et sécurité. SD CREATIV analyse votre présence en ligne et vous propose un plan d'action.",
  path: "/audit-gratuit",
});

const auditPoints = [
  {
    icon: Gauge,
    title: "Performance",
    description: "Vitesse de chargement, score Lighthouse et optimisations possibles.",
  },
  {
    icon: Search,
    title: "SEO & visibilité",
    description: "Référencement Google, structure, balises et présence locale à Abidjan.",
  },
  {
    icon: Smartphone,
    title: "Expérience mobile",
    description: "Responsive, lisibilité et parcours utilisateur sur smartphone.",
  },
  {
    icon: Shield,
    title: "Sécurité & technique",
    description: "HTTPS, plugins obsolètes, sauvegardes et bonnes pratiques.",
  },
];

const auditFaq = [
  {
    question: "L'audit est-il vraiment gratuit ?",
    answer:
      "Oui, l'audit initial est 100 % gratuit et sans engagement. Nous vous remettons un rapport avec nos recommandations.",
  },
  {
    question: "Combien de temps dure l'audit ?",
    answer:
      "Nous analysons votre site sous 48 à 72 heures ouvrées et vous recontactons avec un rapport détaillé.",
  },
];

export default function AuditGratuitPage() {
  return (
    <>
      <FaqJsonLd items={auditFaq} />
      <SitePageHero pageKey="audit-gratuit" />

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {auditPoints.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm"
              >
                <Icon className="mb-4 h-8 w-8 text-primary" aria-hidden />
                <h2 className="font-bold text-foreground">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-text">{description}</p>
              </div>
            ))}
          </div>

          <ul className="mx-auto mt-12 max-w-2xl space-y-3">
            {[
              "Analyse complète de votre site existant",
              "Rapport PDF avec scores et recommandations",
              "Estimation de refonte si nécessaire",
              "Sans engagement — 100 % gratuit",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-foreground/85">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="#demande-audit" size="lg">
              Demander mon audit
            </Button>
            <Button href="/devis" variant="ghost" size="lg">
              Configurateur de devis
            </Button>
          </div>
        </div>
      </section>

      <section id="demande-audit" className="border-t border-gray/40 bg-gray-light py-20 md:py-28">
        <div className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            Demandez votre audit gratuit
          </h2>
          <ContactForm defaultService="refonte-web" />
          <p className="mt-6 text-center text-sm text-gray-text">
            Pas encore de site ?{" "}
            <Link href="/devis" className="font-semibold text-primary hover:underline">
              Estimez votre futur projet →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
