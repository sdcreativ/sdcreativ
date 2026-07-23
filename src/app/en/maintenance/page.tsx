import Link from "next/link";
import { Check } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { enMaintenance } from "@/i18n/en-content";
import { formatFcfa, hasPublicPrice } from "@/lib/format";
import { getSiteMaintenanceSettings } from "@/lib/site-maintenance-settings";
import { createMetadata } from "@/lib/metadata";

export const revalidate = 300;


export const metadata = createMetadata({
  title: "Maintenance & support",
  description: "Website maintenance plans and ongoing support for your digital assets.",
  path: "/en/maintenance",
  locale: "en",
});

export default async function EnMaintenancePage() {
  const { plans, note } = await getSiteMaintenanceSettings();

  return (
    <>
      <PageHero
        eyebrow="Maintenance"
        title={`${enMaintenance.title} ${enMaintenance.highlight}`}
        description={enMaintenance.description}
        breadcrumb={[{ label: "Home", href: "/en" }, { label: "Maintenance" }]}
      />
      <section className="py-16 md:py-20">
        <div className="container mx-auto grid gap-8 px-4 md:grid-cols-3 md:px-6 lg:px-8">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="flex flex-col rounded-2xl border border-gray/60 bg-white p-8 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                SLA {plan.sla}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-foreground">{plan.name}</h2>
              <p className="mt-1 text-sm text-gray-text">{plan.tagline}</p>
              <p className="mt-6 text-xl font-semibold text-primary">
                {hasPublicPrice(plan.priceMonthly) ? (
                  <>
                    {formatFcfa(plan.priceMonthly)} FCFA
                    <span className="text-base font-normal text-gray-text"> / mo</span>
                  </>
                ) : (
                  "Free custom quote"
                )}
              </p>
              <ul className="mt-6 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-gray-text">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <Button href="/en/contact" className="mt-8 w-full justify-center">
                {enMaintenance.cta}
              </Button>
            </article>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-gray-text">{note}</p>
        <p className="mt-6 text-center text-sm text-gray-text">
          Full French page:{" "}
          <Link href="/maintenance" className="font-semibold text-primary hover:underline">
            /maintenance →
          </Link>
        </p>
      </section>
    </>
  );
}
