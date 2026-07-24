import { PageHero } from "@/components/ui/PageHero";
import { CmsLocaleEmpty } from "@/components/ui/CmsLocaleEmpty";
import { FaqSection } from "@/components/sections/FaqSection";
import { Button } from "@/components/ui/Button";
import { FaqJsonLd } from "@/components/seo/JsonLd";
import { enFaq } from "@/i18n/en-content";
import { getFaqItems } from "@/lib/public-faq-resolver";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "FAQ — Frequently asked questions",
  description:
    "Answers about our web services, timelines, maintenance and support for SMEs in Côte d'Ivoire and abroad.",
  path: "/en/faq",
  locale: "en",
});

export default async function EnFaqPage() {
  const faqItems = await getFaqItems("en");

  return (
    <>
      {faqItems.length > 0 && <FaqJsonLd items={faqItems} />}
      <PageHero
        eyebrow="FAQ"
        title={enFaq.title}
        highlight={enFaq.highlight}
        description={enFaq.description}
        breadcrumb={[
          { label: "Home", href: "/en" },
          { label: "FAQ" },
        ]}
      />
      {faqItems.length === 0 ? (
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <CmsLocaleEmpty
              title="English FAQ coming soon"
              description="We are publishing English answers in the CMS. Contact us for timelines, quotes or project questions — or browse the French FAQ."
            />
          </div>
        </section>
      ) : (
        <FaqSection items={faqItems} locale="en" />
      )}
      <section className="border-t border-gray/40 bg-primary-light py-16">
        <div className="container mx-auto px-4 text-center md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">{enFaq.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-foreground/80">{enFaq.ctaDescription}</p>
          <Button href="/en/contact" className="mt-6">
            {enFaq.ctaButton}
          </Button>
        </div>
      </section>
    </>
  );
}
