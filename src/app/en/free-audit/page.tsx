import { CheckCircle2 } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { ContactForm } from "@/components/forms/ContactForm";
import { enAudit } from "@/i18n/en-content";
import { auditContentEn } from "@/i18n/public-en";
import { getLucideIcon } from "@/lib/lucide-icon-map";
import { createMetadata } from "@/lib/metadata";

export const revalidate = 300;

export const metadata = createMetadata({
  title: "Free website audit",
  description:
    "Free website audit: performance, SEO, mobile and security. Get a clear action plan from SD CREATIV.",
  path: "/en/free-audit",
  locale: "en",
});

export default function EnFreeAuditPage() {
  return (
    <>
      <PageHero
        eyebrow="Free audit"
        title={`${enAudit.title} ${enAudit.highlight}`}
        description={enAudit.description}
        breadcrumb={[{ label: "Home", href: "/en" }, { label: "Free audit" }]}
      />
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {auditContentEn.points.map((point) => {
              const Icon = getLucideIcon(point.icon);
              return (
                <div
                  key={point.title}
                  className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm"
                >
                  <Icon className="mb-4 h-8 w-8 text-primary" aria-hidden />
                  <h2 className="font-bold text-foreground">{point.title}</h2>
                  <p className="mt-2 text-sm text-gray-text">{point.description}</p>
                </div>
              );
            })}
          </div>
          <ul className="mx-auto mt-12 max-w-2xl space-y-3">
            {auditContentEn.checklist.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-foreground/85">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-10 text-center">
            <Button href="#request-audit" size="lg">
              {enAudit.cta}
            </Button>
          </div>
        </div>
      </section>
      <section id="request-audit" className="border-t border-gray/40 bg-gray-light py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            {auditContentEn.formTitle}
          </h2>
          <ContactForm defaultSubject="audit" locale="en" />
        </div>
      </section>
    </>
  );
}
