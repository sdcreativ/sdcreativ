import Link from "next/link";
import { SitePageHero } from "@/components/ui/SitePageHero";
import { Button } from "@/components/ui/Button";
import { AccordionItem } from "@/components/ui/Accordion";
import { MaintenancePlansSection } from "@/components/sections/MaintenancePlansSection";
import { FaqJsonLd } from "@/components/seo/JsonLd";
import { getLucideIcon } from "@/lib/lucide-icon-map";
import { getSiteMaintenanceSettings } from "@/lib/site-maintenance-settings";
import { createMetadata } from "@/lib/metadata";

export const revalidate = 300;


export const metadata = createMetadata({
  title: "Maintenance & SLA",
  description:
    "Formules de maintenance web sur devis : Essentiel, Professionnel et Premium SLA. Sauvegardes, mises à jour, monitoring et support réactif à Abidjan.",
  path: "/maintenance",
});

export default async function MaintenancePage() {
  const content = await getSiteMaintenanceSettings();

  return (
    <>
      <FaqJsonLd items={content.faq} />
      <SitePageHero pageKey="maintenance" />

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {content.highlights.map((item) => {
              const Icon = getLucideIcon(item.icon);
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm"
                >
                  <Icon className="mb-4 h-8 w-8 text-primary" aria-hidden />
                  <h2 className="font-bold text-foreground">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-text">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <MaintenancePlansSection />

      <section className="border-t border-gray/40 bg-gray-light py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            {content.slaHeading}
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
                {content.slaComparison.map((row, i) => (
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
          <p className="mt-4 text-center text-xs text-gray-text">{content.note}</p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
          <h2 className="mb-8 text-2xl font-bold text-foreground">{content.faqHeading}</h2>
          {content.faq.map((item) => (
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
