import { Check } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { enMaintenance } from "@/i18n/en-content";
import { maintenancePlansEn } from "@/i18n/public-en";
import { PRICE_ON_REQUEST_LABEL_EN } from "@/lib/format";
import { createMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export const revalidate = 300;

export const metadata = createMetadata({
  title: "Maintenance & support",
  description: "Website maintenance plans and ongoing support for your digital assets.",
  path: "/en/maintenance",
  locale: "en",
});

export default function EnMaintenancePage() {
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
          {maintenancePlansEn.map((plan) => (
            <article
              key={plan.id}
              className={cn(
                "flex flex-col rounded-2xl border border-gray/60 bg-white p-8 shadow-sm",
                "highlighted" in plan && plan.highlighted && "border-primary ring-2 ring-primary/20",
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                SLA {plan.sla}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-foreground">{plan.name}</h2>
              <p className="mt-1 text-sm text-gray-text">{plan.tagline}</p>
              <p className="mt-6 text-xl font-semibold text-primary">
                {PRICE_ON_REQUEST_LABEL_EN}
              </p>
              <p className="mt-2 text-sm text-gray-text">Response: {plan.responseTime}</p>
              <ul className="mt-6 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-gray-text">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <Button href="/en/devis?type=maintenance" className="mt-8 w-full justify-center">
                {enMaintenance.cta}
              </Button>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
