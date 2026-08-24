import { notFound } from "next/navigation";
import { BlogArticleView } from "@/components/blog/BlogArticleView";
import { BlogPostTracker } from "@/components/blog/BlogPostTracker";
import { BlogPreviewBanner } from "@/components/blog/BlogPreviewBanner";
import { BlogArticleJsonLd } from "@/components/seo/BlogArticleJsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { getBlogPostOrRedirect } from "@/lib/blog-load";
import { getBlogPosts } from "@/lib/cms";

type Options = {
  slug: string;
  previewToken?: string;
};

export async function renderBlogPostPage({ slug, previewToken }: Options) {
  const post = await getBlogPostOrRedirect(slug, { previewToken });
  if (!post) notFound();

  const isPreview = Boolean(previewToken);
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

  return {
    post,
    isPreview,
    content: (
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
    ),
  };
}
