import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { TeamSection } from "@/components/sections/TeamSection";
import { Button } from "@/components/ui/Button";
import { enAbout } from "@/i18n/en-content";
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
        title={enAbout.title}
        highlight={enAbout.highlight}
        description={enAbout.description}
        breadcrumb={[
          { label: "Home", href: "/en" },
          { label: "About" },
        ]}
      />
      <TeamSection locale="en" />
      <section className="py-16 text-center">
        <Button href="/en/contact" size="lg">
          Work with us
        </Button>
        <p className="mt-6 text-sm text-gray-text">
          <Link href="/a-propos" className="text-primary hover:underline">
            Page à propos (FR) →
          </Link>
        </p>
      </section>
    </>
  );
}
