import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Blog",
  description: "Insights on web development, SEO and digital strategy.",
  path: "/en/blog",
  locale: "en",
});

export default function EnBlogPage() {
  return (
    <>
      <PageHero
        eyebrow="Blog"
        title="Insights & news"
        description="Articles are primarily published in French — English summaries coming soon."
        breadcrumb={[{ label: "Home", href: "/en" }, { label: "Blog" }]}
      />
      <section className="container mx-auto px-4 py-16 text-center">
        <Link href="/blog" className="inline-flex rounded-xl border border-primary px-6 py-3 font-semibold text-primary">
          Read the blog (FR)
        </Link>
      </section>
    </>
  );
}
