import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
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
        title="Build digital products with us"
        description="We are growing our team in Abidjan and remotely."
        breadcrumb={[{ label: "Home", href: "/en" }, { label: "Careers" }]}
      />
      <section className="py-16">
        <div className="container mx-auto max-w-2xl px-4 text-center">
          <p className="text-gray-text mb-6">
            View open positions on our French careers page (applications accepted in French or English).
          </p>
          <Link href="/carrieres" className="inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-white">
            View job offers
          </Link>
        </div>
      </section>
    </>
  );
}
