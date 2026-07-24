import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { careersEn } from "@/i18n/public-en";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Careers",
  description: "Join SD CREATIV — web agency careers and opportunities.",
  path: "/en/careers",
  locale: "en",
});

export default function EnCareersPage() {
  return (
    <>
      <PageHero
        eyebrow="Careers"
        title={`${careersEn.title} ${careersEn.highlight}`}
        description={careersEn.description}
        breadcrumb={[{ label: "Home", href: "/en" }, { label: "Careers" }]}
      />
      <section className="py-16 md:py-20">
        <div className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground">{careersEn.openRolesTitle}</h2>
          <div className="mt-8 space-y-6">
            {careersEn.openRoles.map((role) => (
              <article
                key={role.title}
                className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm"
              >
                <h3 className="text-xl font-bold text-foreground">{role.title}</h3>
                <p className="mt-1 text-sm text-primary">
                  {role.location} · {role.type}
                </p>
                <p className="mt-3 text-sm text-gray-text">{role.summary}</p>
              </article>
            ))}
          </div>
          <div className="mt-14 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
            <h2 className="text-xl font-bold text-foreground">{careersEn.ctaTitle}</h2>
            <p className="mt-2 text-sm text-gray-text">{careersEn.ctaDescription}</p>
            <Button href="/en/contact" className="mt-6">
              {careersEn.ctaButton}
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
