import { PageHero } from "@/components/ui/PageHero";
import { TeamSection } from "@/components/sections/TeamSection";
import { Button } from "@/components/ui/Button";
import { aboutEn } from "@/i18n/public-en";
import { createMetadata } from "@/lib/metadata";

export const revalidate = 300;

export const metadata = createMetadata({
  title: "About us",
  description:
    "SD CREATIV is a web agency based in Abidjan, specializing in websites and digital solutions for SMEs.",
  path: "/en/about",
  locale: "en",
});

export default function EnAboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title={aboutEn.title}
        highlight={aboutEn.highlight}
        description={aboutEn.description}
        breadcrumb={[
          { label: "Home", href: "/en" },
          { label: "About" },
        ]}
      />

      <section className="bg-white py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-foreground">
            {aboutEn.valuesTitle}
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {aboutEn.values.map((value) => (
              <div
                key={value.title}
                className="rounded-2xl border border-gray/60 p-8 text-center shadow-sm"
              >
                <h3 className="text-lg font-bold text-foreground">{value.title}</h3>
                <p className="mt-2 text-sm text-gray-text">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-gray/40 bg-gray-light py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-foreground">
            {aboutEn.methodTitle}
          </h2>
          <ol className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
            {aboutEn.methodSteps.map((step, i) => (
              <li
                key={step.title}
                className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Step {i + 1}
                </p>
                <h3 className="mt-2 text-lg font-bold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-text">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <TeamSection locale="en" />

      <section className="py-16 text-center">
        <Button href="/en/contact" size="lg">
          Work with us
        </Button>
      </section>
    </>
  );
}
