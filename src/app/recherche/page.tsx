import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { getBlogPosts } from "@/lib/cms";
import { createMetadata } from "@/lib/metadata";
import { filterSiteSearchPosts } from "@/lib/site-search";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export const metadata = createMetadata({
  title: "Recherche",
  description:
    "Recherchez des articles et conseils sur le web, le SEO et le marketing digital sur le site SD CREATIV.",
  path: "/recherche",
});

export default async function RecherchePage({ searchParams }: Props) {
  const { q: rawQuery } = await searchParams;
  const query = rawQuery?.trim() ?? "";
  const allPosts = await getBlogPosts();
  const results = query ? filterSiteSearchPosts(allPosts, query) : [];

  return (
    <>
      <PageHero
        eyebrow="Recherche"
        title="Trouver un"
        highlight="article"
        description="Parcourez nos guides blog par mot-clé : web, SEO, e-commerce, agents IA."
        breadcrumb={[{ label: "Accueil", href: "/" }, { label: "Recherche" }]}
      />

      <section className="py-16 md:py-20">
        <div className="container mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
          <form action="/recherche" method="get" className="mb-10">
            <label htmlFor="site-search" className="sr-only">
              Rechercher sur le site
            </label>
            <div className="flex gap-2">
              <input
                id="site-search"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Ex. SEO, e-commerce, agents IA…"
                className="flex-1 rounded-xl border border-gray/60 bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none ring-primary/30 focus:ring-2"
                autoComplete="off"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
              >
                <Search className="h-4 w-4" aria-hidden />
                Rechercher
              </button>
            </div>
          </form>

          {!query && (
            <p className="text-center text-sm text-gray-text">
              Saisissez un mot-clé pour afficher les articles correspondants.
            </p>
          )}

          {query && results.length === 0 && (
            <p className="text-center text-sm text-gray-text">
              Aucun résultat pour « {query} ». Essayez un autre terme ou consultez le{" "}
              <Link href="/blog" className="font-semibold text-primary hover:underline">
                blog
              </Link>
              .
            </p>
          )}

          {results.length > 0 && (
            <ul className="space-y-4">
              {results.map((post) => (
                <li
                  key={post.slug}
                  className="rounded-2xl border border-gray/60 bg-white p-5 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {post.category}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-foreground">
                    <Link href={`/blog/${post.slug}`} className="hover:text-primary">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-text">{post.excerpt}</p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary"
                  >
                    Lire l&apos;article
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
