import type { BlogPost } from "@/content/blog";

export function filterSiteSearchPosts(posts: BlogPost[], query: string): BlogPost[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return posts.filter((post) => {
    const haystack = [
      post.title,
      post.excerpt,
      post.category,
      ...(post.tags ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
