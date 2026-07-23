import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { PricingSection } from "@/components/sections/PricingSection";
import { Button } from "@/components/ui/Button";
import { enPricing } from "@/i18n/en-content";
import { createMetadata } from "@/lib/metadata";

export const revalidate = 300;


export const metadata = createMetadata({
  title: "Pricing",
  description: "Essentiel, Professional and Business packages — web solutions adapted to your growth stage.",
  path: "/en/pricing",
  locale: "en",
});

export default function EnPricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title={enPricing.title}
        highlight={enPricing.highlight}
        description={enPricing.description}
        breadcrumb={[
          { label: "Home", href: "/en" },
          { label: "Pricing" },
        ]}
      />
      <PricingSection locale="en" />
      <section className="py-16 text-center">
        <Button href="/en/devis" size="lg">
          Online quote calculator
        </Button>
        <p className="mt-6 text-sm text-gray-text">
          <Link href="/tarifs" className="text-primary hover:underline">
            French pricing page →
          </Link>
        </p>
      </section>
    </>
  );
}
