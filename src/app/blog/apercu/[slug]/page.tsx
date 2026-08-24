import { getBlogPostOrRedirect } from "@/lib/blog-load";
import { renderBlogPostPage } from "@/lib/blog-article-page";
import { createMetadata } from "@/lib/metadata";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const post = await getBlogPostOrRedirect(slug, { previewToken: preview });
  if (!post) return {};

  return createMetadata({
    title: `[Aperçu] ${post.metaTitle ?? post.title}`,
    description: post.metaDescription ?? post.excerpt,
    path: `/blog/apercu/${slug}`,
    noIndex: true,
    image: post.ogImage ?? post.coverImage,
    openGraphType: "article",
    publishedTime: post.date,
    modifiedTime: post.updatedAt ?? post.date,
  });
}

export default async function BlogPostPreviewPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const { content } = await renderBlogPostPage({ slug, previewToken: preview });
  return content;
}
