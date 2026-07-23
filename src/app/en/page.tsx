import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { enHome } from "@/i18n/en-content";
import { PartnersSection } from "@/components/sections/PartnersSection";
import { ClientsSection } from "@/components/sections/ClientsSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { GoogleReviewsSection } from "@/components/sections/GoogleReviewsSection";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Web agency Abidjan",
  description:
    "Professional websites, e-commerce, AI agents and digital solutions for SMEs in Côte d'Ivoire.",
  path: "/en",
  locale: "en",
});

export default function EnHomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-dark pt-28 pb-20 md:pt-32 md:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,114,181,0.15),_transparent_60%)]" />
        <div className="container relative mx-auto px-4 text-center md:px-6 lg:px-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary-light">
            {enHome.hero.eyebrow}
          </p>
          <h1 className="text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            {enHome.hero.title}{" "}
            <span className="text-primary-light">{enHome.hero.highlight}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            {enHome.hero.description}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="/en/devis" size="lg">
              {enHome.hero.ctaPrimary}
            </Button>
            <Button href="/en/portfolio" variant="outline" size="lg">
              {enHome.hero.ctaSecondary}
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-foreground md:text-4xl">
            {enHome.why.title}{" "}
            <span className="text-primary">{enHome.why.highlight}</span>
          </h2>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {enHome.why.items.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-gray/60 p-8 text-center shadow-sm"
              >
                <CheckCircle2 className="mx-auto h-8 w-8 text-primary" aria-hidden />
                <h3 className="mt-4 text-lg font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-text">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PartnersSection locale="en" />
      <ClientsSection locale="en" />
      <PricingSection locale="en" />
      <GoogleReviewsSection locale="en" />
      <TestimonialsSection locale="en" />
      <FaqSection locale="en" />

      <section className="bg-dark py-16 text-center md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white md:text-3xl">{enHome.cta.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">{enHome.cta.description}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="/en/devis" size="lg">
              {enHome.hero.ctaPrimary}
            </Button>
            <Button href="/en/contact" variant="outline" size="lg">
              {enHome.cta.button}
            </Button>
          </div>
          <p className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-primary-light hover:underline"
            >
              Version française
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
