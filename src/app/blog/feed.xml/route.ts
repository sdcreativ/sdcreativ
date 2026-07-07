import { buildBlogRssFeed } from "@/lib/blog-rss";
import { listPublishedBlogPosts, toPublicBlogPost } from "@/lib/blog-posts";
import { isDatabaseConfigured } from "@/lib/db";
import { getBlogPosts } from "@/lib/cms";
import { getSitePublicSettings } from "@/lib/site-public-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  let posts;
  if (isDatabaseConfigured()) {
    const records = await listPublishedBlogPosts();
    posts = records.map(toPublicBlogPost);
  } else {
    posts = await getBlogPosts();
  }

  const { contact } = await getSitePublicSettings();
  const xml = buildBlogRssFeed(posts, contact.email);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
