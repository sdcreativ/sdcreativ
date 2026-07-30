import { notFound } from "next/navigation";
import { BlogArticleView } from "@/components/blog/BlogArticleView";
import { BlogPostTracker } from "@/components/blog/BlogPostTracker";
import { BlogPreviewBanner } from "@/components/blog/BlogPreviewBanner";
import { BlogArticleJsonLd } from "@/components/seo/BlogArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { getBlogPostOrRedirect } from "@/lib/blog-load";
import { getBlogPosts } from "@/lib/cms";
import { createMetadata } from "@/lib/metadata";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

/** Preview (?preview=) + lecture CMS en DB → rendu dynamique (évite DYNAMIC_SERVER_USAGE). */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const post = await getBlogPostOrRedirect(slug, { previewToken: preview });
  if (!post) return {};

  return createMetadata({
    title: post.metaTitle ?? post.title,
    description: post.metaDescription ?? post.excerpt,
    path: `/blog/${slug}`,
    noIndex: Boolean(preview),
    image: post.ogImage ?? post.coverImage,
  });
}

export default async function BlogPostPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const post = await getBlogPostOrRedirect(slug, { previewToken: preview });

  if (!post) notFound();

  const isPreview = Boolean(preview);
  const allPosts = await getBlogPosts();
  const related = allPosts
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => {
      const sameCat = Number(b.category === post.category) - Number(a.category === post.category);
      if (sameCat !== 0) return sameCat;
      return b.date.localeCompare(a.date);
    })
    .slice(0, 3);

  const breadcrumb = [
    { label: "Accueil", href: "/" },
    { label: "Blog", href: "/blog" },
    { label: post.title },
  ];

  return (
    <>
      {!isPreview && <BlogPostTracker slug={post.slug} />}
      {isPreview && <BlogPreviewBanner />}
      <BlogArticleJsonLd post={post} />
      <BreadcrumbJsonLd items={breadcrumb} />
      <BlogArticleView
        post={post}
        related={related}
        locale="fr"
        showComments={!isPreview}
      />
    </>
  );
}
