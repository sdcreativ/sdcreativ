import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { enLegal } from "@/i18n/en-content";
import { legalNoticeEn } from "@/i18n/public-en";
import { SITE } from "@/lib/constants";
import { getSitePublicSettings } from "@/lib/site-public-settings";
import { createMetadata } from "@/lib/metadata";

export const revalidate = 300;

export const metadata = createMetadata({
  title: "Legal notice",
  description: enLegal.description,
  path: "/en/legal",
  locale: "en",
});

export default async function EnLegalPage() {
  const { contact, legal } = await getSitePublicSettings();

  return (
    <>
      <PageHero
        eyebrow="Legal"
        title={enLegal.noticeTitle}
        description={enLegal.description}
        breadcrumb={[{ label: "Home", href: "/en" }, { label: "Legal" }]}
      />
      <section className="container mx-auto max-w-3xl space-y-8 px-4 py-16 text-sm leading-relaxed text-gray-text md:px-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">Publisher</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>
              <strong>{SITE.name}</strong>
            </li>
            {legal.rccm ? <li>RCCM: {legal.rccm}</li> : null}
            <li>Address: {contact.address}</li>
            <li>Email: {contact.email}</li>
            <li>Phone: {contact.phone}</li>
          </ul>
        </div>
        {legal.hostName ? (
          <div>
            <h2 className="text-lg font-bold text-foreground">Hosting</h2>
            <p className="mt-2">
              {legal.hostName}
              {legal.hostAddress ? ` — ${legal.hostAddress}` : ""}
            </p>
          </div>
        ) : null}
        {legalNoticeEn.sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
            <p className="mt-2">{section.body}</p>
          </div>
        ))}
        <p>
          <Link href="/en/privacy" className="font-semibold text-primary hover:underline">
            Privacy policy →
          </Link>
        </p>
      </section>
    </>
  );
}
