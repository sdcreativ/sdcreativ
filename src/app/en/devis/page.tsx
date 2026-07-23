import { Suspense } from "react";
import { PageHero } from "@/components/ui/PageHero";
import { QuoteConfigurator } from "@/components/forms/QuoteConfigurator";
import { BookAppointment } from "@/components/booking/BookAppointment";
import { Button } from "@/components/ui/Button";
import { enQuote } from "@/i18n/en-content";
import { createMetadata } from "@/lib/metadata";
import { getQuoteConfig } from "@/lib/quote-config-resolver";

export const revalidate = 300;

export const metadata = createMetadata({
  title: "Online quote",
  description:
    "Describe your web project and get a free custom quote from SD CREATIV in Abidjan — websites, e-commerce, AI agents and more.",
  path: "/en/devis",
  locale: "en",
});

export default async function EnDevisPage() {
  const config = await getQuoteConfig();

  return (
    <>
      <PageHero
        eyebrow="Quote"
        title={enQuote.title}
        highlight={enQuote.highlight}
        description={enQuote.description}
        breadcrumb={[
          { label: "Home", href: "/en" },
          { label: "Quote" },
        ]}
      />

      <section className="bg-gray-light py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <p className="mx-auto mb-8 max-w-3xl rounded-xl border border-primary/15 bg-white px-4 py-3 text-center text-sm text-gray-text">
            {enQuote.configNote}
          </p>
          <Suspense fallback={<p className="text-center text-gray-text">Loading…</p>}>
            <QuoteConfigurator config={config} locale="en" />
          </Suspense>
        </div>
      </section>

      <section className="border-t border-gray/40 bg-white py-16">
        <div className="container mx-auto grid gap-8 px-4 md:grid-cols-2 md:px-6 lg:px-8">
          <div className="flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-foreground">{enQuote.bookTitle}</h2>
            <p className="mt-3 text-gray-text">{enQuote.bookDescription}</p>
            <Button href="/en/contact" variant="ghost" className="mt-4 w-fit">
              {enQuote.contactCta}
            </Button>
          </div>
          <BookAppointment />
        </div>
      </section>
    </>
  );
}
