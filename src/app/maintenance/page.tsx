import Link from "next/link";
import { Wrench, Shield, Clock, RefreshCw } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { AccordionItem } from "@/components/ui/Accordion";
import { MaintenancePlansSection } from "@/components/sections/MaintenancePlansSection";
import { FaqJsonLd } from "@/components/seo/JsonLd";
import {
  maintenanceFaq,
  maintenanceNote,
  slaComparison,
} from "@/content/maintenance-plans";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Maintenance & SLA",
  description:
    "Formules de maintenance web en FCFA : Essentiel, Professionnel et Premium SLA. Sauvegardes, mises à jour, monitoring et support réactif à Abidjan.",
  path: "/maintenance",
});

const highlights = [
  {
    icon: RefreshCw,
    title: "Mises à jour",
    description: "CMS, plugins, dépendances et correctifs de sécurité.",
  },
  {
    icon: Shield,
    title: "Sauvegardes",
    description: "Restauration rapide en cas d'incident ou de piratage.",
  },
  {
    icon: Clock,
    title: "SLA garanti",
    description: "Délais de réponse contractuels selon votre formule.",
  },
  {
    icon: Wrench,
    title: "Interventions",
    description: "Corrections, ajustements et assistance technique incluse.",
  },
];

export default function MaintenancePage() {
  return (
    <>
      <FaqJsonLd items={[...maintenanceFaq]} />
      <PageHero
        eyebrow="Accompagnement continu"
        title="Maintenance"
        highlight="& SLA"
        description="Gardez votre site rapide, sécurisé et à jour. Formules mensuelles ou annuelles en FCFA — revenus récurrents, sérénité garantie."
        breadcrumb={[
          { label: "Accueil", href: "/" },
          { label: "Maintenance & SLA" },
        ]}
      />

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map(({ icon: Icon, title, description }) => (
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
        </div>
      </section>

      <MaintenancePlansSection />

      <section className="border-t border-gray/40 bg-gray-light py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            Comparatif SLA
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-gray/60 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray/40 bg-primary-light/50">
                  <th className="px-4 py-3 text-left font-bold text-foreground">Critère</th>
                  <th className="px-4 py-3 text-left font-bold text-foreground">Essentiel</th>
                  <th className="px-4 py-3 text-left font-bold text-primary">Professionnel</th>
                  <th className="px-4 py-3 text-left font-bold text-foreground">Premium SLA</th>
                </tr>
              </thead>
              <tbody>
                {slaComparison.map((row, i) => (
                  <tr
                    key={row.label}
                    className={i % 2 === 0 ? "bg-white" : "bg-gray-light/30"}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{row.label}</td>
                    <td className="px-4 py-3 text-gray-text">{row.essentiel}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{row.professionnel}</td>
                    <td className="px-4 py-3 text-gray-text">{row.premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-xs text-gray-text">{maintenanceNote}</p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
          <h2 className="mb-8 text-2xl font-bold text-foreground">Questions fréquentes</h2>
          {maintenanceFaq.map((item) => (
            <AccordionItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </section>

      <section className="border-t border-gray/40 bg-primary-light py-16 text-center md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">
            Site existant ? Commencez par un audit
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-text">
            Nous évaluons l&apos;état de votre site avant de proposer la formule maintenance
            adaptée.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="/audit-gratuit" size="lg">
              Audit web gratuit
            </Button>
            <Button href="/devis?type=maintenance" variant="ghost" size="lg">
              Devis maintenance
            </Button>
          </div>
          <p className="mt-6 text-sm text-gray-text">
            Voir aussi nos{" "}
            <Link href="/services" className="font-semibold text-primary hover:underline">
              services maintenance →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
