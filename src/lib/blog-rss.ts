import type { BlogPost } from "@/content/blog";
import { SITE } from "@/lib/constants";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildBlogRssFeed(posts: BlogPost[], contactEmail: string): string {
  const items = posts
    .map((post) => {
      const link = absoluteUrl(`/blog/${post.slug}`);
      const description = escapeXml(post.excerpt);
      const pubDate = new Date(post.date).toUTCString();
      const image = post.ogImage ?? post.coverImage;
      const content = post.contentHtml
        ? `<![CDATA[${post.contentHtml}]]>`
        : `<![CDATA[${post.content.map((p) => `<p>${escapeXml(p)}</p>`).join("")}]]>`;

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(post.category)}</category>
      ${image ? `<enclosure url="${escapeXml(absoluteUrl(image))}" type="image/jpeg" />` : ""}
      <content:encoded>${content}</content:encoded>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(`${SITE.name} — Blog`)}</title>
    <link>${absoluteUrl("/blog")}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>fr-fr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${absoluteUrl("/blog/feed.xml")}" rel="self" type="application/rss+xml" />
    <managingEditor>${escapeXml(contactEmail)} (${escapeXml(SITE.name)})</managingEditor>
    <webMaster>${escapeXml(contactEmail)} (${escapeXml(SITE.name)})</webMaster>
${items}
  </channel>
</rss>`;
}
