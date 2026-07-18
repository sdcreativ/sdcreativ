import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { enLegal } from "@/i18n/en-content";
import { getSiteLegalSettings } from "@/lib/site-legal-settings";
import { getSitePublicSettings } from "@/lib/site-public-settings";
import { createMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Privacy policy",
  description: enLegal.privacyIntro,
  path: "/en/privacy",
  locale: "en",
});

export default async function EnPrivacyPage() {
  const [{ contact }, legal] = await Promise.all([
    getSitePublicSettings(),
    getSiteLegalSettings(),
  ]);

  return (
    <>
      <PageHero
        eyebrow="Privacy"
        title={enLegal.privacyTitle}
        description={enLegal.privacyIntro}
        breadcrumb={[{ label: "Home", href: "/en" }, { label: "Privacy" }]}
      />
      <section className="container mx-auto max-w-3xl space-y-8 px-4 py-16 text-sm leading-relaxed text-gray-text md:px-6">
        <p className="text-xs text-gray-text">
          {legal.privacyUpdatedLabel} · Contact:{" "}
          <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
            {contact.email}
          </a>
        </p>
        {legal.privacySections.map((section) => (
          <article key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
            {section.intro ? <p className="mt-2">{section.intro}</p> : null}
            {section.paragraphs?.map((p) => (
              <p key={p.slice(0, 32)} className="mt-2">
                {p === "__CONTACT_BLOCK__"
                  ? `${contact.email} · ${contact.phone} · ${contact.address}`
                  : p}
              </p>
            ))}
            {section.bullets && section.bullets.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5">
                {section.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
            {section.dataCategories && (
              <ul className="mt-3 space-y-2">
                {section.dataCategories.map((c) => (
                  <li key={c.label}>
                    <strong className="text-foreground">{c.label}:</strong> {c.details}
                  </li>
                ))}
              </ul>
            )}
            {section.subprocessors && (
              <ul className="mt-3 space-y-2">
                {section.subprocessors.map((s) => (
                  <li key={s.name}>
                    <strong className="text-foreground">{s.name}:</strong> {s.role}
                  </li>
                ))}
              </ul>
            )}
            {section.footer && section.footer !== "__RIGHTS_CONTACT__" ? (
              <p className="mt-3 text-xs">{section.footer}</p>
            ) : null}
            {section.footer === "__RIGHTS_CONTACT__" ? (
              <p className="mt-3 text-xs">
                Contact us at {contact.email} to exercise your rights.
              </p>
            ) : null}
          </article>
        ))}
        <p>
          <Link
            href="/politique-confidentialite"
            className="font-semibold text-primary hover:underline"
          >
            Full French privacy policy →
          </Link>
        </p>
      </section>
    </>
  );
}
