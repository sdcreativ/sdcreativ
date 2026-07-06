import { PageHero } from "@/components/ui/PageHero";
import { ContactForm } from "@/components/forms/ContactForm";
import { enContact } from "@/i18n/en-content";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Contact",
  description: "Get in touch with SD CREATIV for a free quote on your web project in Abidjan.",
  path: "/en/contact",
  locale: "en",
});

export default function EnContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={enContact.title}
        highlight={enContact.highlight}
        description={enContact.description}
        breadcrumb={[
          { label: "Home", href: "/en" },
          { label: "Contact" },
        ]}
      />
      <section className="py-20 md:py-28">
        <div className="container mx-auto max-w-2xl px-4 md:px-6 lg:px-8">
          <ContactForm />
        </div>
      </section>
    </>
  );
}
