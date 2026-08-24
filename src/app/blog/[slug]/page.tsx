import { getBlogPostOrRedirect } from "@/lib/blog-load";
import { getBlogPosts } from "@/lib/cms";
import { renderBlogPostPage } from "@/lib/blog-article-page";
import { createMetadata } from "@/lib/metadata";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostOrRedirect(slug);
  if (!post) return {};

  return createMetadata({
    title: post.metaTitle ?? post.title,
    description: post.metaDescription ?? post.excerpt,
    path: `/blog/${slug}`,
    image: post.ogImage ?? post.coverImage,
    openGraphType: "article",
    publishedTime: post.date,
    modifiedTime: post.updatedAt ?? post.date,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const { content } = await renderBlogPostPage({ slug });
  return content;
}
