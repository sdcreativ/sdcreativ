import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Legal",
  description: "Legal notice and privacy policy — SD CREATIV.",
  path: "/en/legal",
  locale: "en",
});

export default function EnLegalPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Legal information"
        breadcrumb={[{ label: "Home", href: "/en" }, { label: "Legal" }]}
      />
      <section className="container mx-auto max-w-3xl space-y-6 px-4 py-16 text-sm text-gray-text">
        <p>
          Full legal pages are available in French. English versions are being aligned with our FR content.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <Link href="/mentions-legales" className="text-primary hover:underline">
              Legal notice (FR)
            </Link>
          </li>
          <li>
            <Link href="/politique-confidentialite" className="text-primary hover:underline">
              Privacy policy (FR)
            </Link>
          </li>
        </ul>
      </section>
    </>
  );
}
