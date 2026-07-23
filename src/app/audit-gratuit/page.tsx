import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { SitePageHero } from "@/components/ui/SitePageHero";
import { Button } from "@/components/ui/Button";
import { ContactForm } from "@/components/forms/ContactForm";
import { FaqJsonLd } from "@/components/seo/JsonLd";
import { getLucideIcon } from "@/lib/lucide-icon-map";
import { getSiteAuditSettings } from "@/lib/site-audit-settings";
import { createMetadata } from "@/lib/metadata";

export const revalidate = 300;

export const metadata = createMetadata({
  title: "Audit web gratuit",
  description:
    "Audit gratuit de votre site web : performance, SEO, mobile et sécurité. SD CREATIV analyse votre présence en ligne et vous propose un plan d'action.",
  path: "/audit-gratuit",
});

export default async function AuditGratuitPage() {
  const content = await getSiteAuditSettings();

  return (
    <>
      <FaqJsonLd items={content.faq} />
      <SitePageHero pageKey="audit-gratuit" />

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {content.points.map((point) => {
              const Icon = getLucideIcon(point.icon);
              return (
                <div
                  key={point.title}
                  className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm"
                >
                  <Icon className="mb-4 h-8 w-8 text-primary" aria-hidden />
                  <h2 className="font-bold text-foreground">{point.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-text">{point.description}</p>
                </div>
              );
            })}
          </div>

          <ul className="mx-auto mt-12 max-w-2xl space-y-3">
            {content.checklist.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-foreground/85">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button href="#demande-audit" size="lg">
              {content.ctaPrimaryLabel}
            </Button>
            <Button href={content.ctaSecondaryHref} variant="ghost" size="lg">
              {content.ctaSecondaryLabel}
            </Button>
          </div>
        </div>
      </section>

      <section id="demande-audit" className="border-t border-gray/40 bg-gray-light py-20 md:py-28">
        <div className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            {content.formTitle}
          </h2>
          <ContactForm defaultSubject="audit" />
          <p className="mt-6 text-center text-sm text-gray-text">
            {content.formFooter}{" "}
            <Link href="/devis" className="font-semibold text-primary hover:underline">
              Estimez votre futur projet →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
