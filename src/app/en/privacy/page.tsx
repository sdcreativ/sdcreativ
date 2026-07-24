import { PageHero } from "@/components/ui/PageHero";
import { enLegal } from "@/i18n/en-content";
import { privacyPolicyEn } from "@/i18n/public-en";
import { getSitePublicSettings } from "@/lib/site-public-settings";
import { createMetadata } from "@/lib/metadata";

export const revalidate = 300;

export const metadata = createMetadata({
  title: "Privacy policy",
  description: privacyPolicyEn.intro,
  path: "/en/privacy",
  locale: "en",
});

export default async function EnPrivacyPage() {
  const { contact } = await getSitePublicSettings();

  return (
    <>
      <PageHero
        eyebrow="Privacy"
        title={enLegal.privacyTitle}
        description={privacyPolicyEn.intro}
        breadcrumb={[{ label: "Home", href: "/en" }, { label: "Privacy" }]}
      />
      <section className="container mx-auto max-w-3xl space-y-8 px-4 py-16 text-sm leading-relaxed text-gray-text md:px-6">
        <p className="text-xs text-gray-text">
          Contact:{" "}
          <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
            {contact.email}
          </a>
        </p>
        {privacyPolicyEn.sections.map((section) => (
          <article
            key={section.title}
            id={section.title === "Cookies" ? "cookies" : undefined}
            className="scroll-mt-24"
          >
            <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
            <p className="mt-2">{section.body}</p>
          </article>
        ))}
      </section>
    </>
  );
}
