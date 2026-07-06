import type { BlogPostRecord } from "@/lib/blog-posts-types";
import type { BlogPostStatus } from "@/content/blog-labels";
import { parseFetchJson } from "@/lib/fetch-json";

export type BlogPostsAdminResponse = {
  posts: BlogPostRecord[];
  trashCount: number;
};

export async function fetchBlogPostsAdmin(params?: {
  status?: BlogPostStatus;
  q?: string;
  trash?: boolean;
  tag?: string;
}): Promise<BlogPostsAdminResponse> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.q) search.set("q", params.q);
  if (params?.tag) search.set("tag", params.tag);
  if (params?.trash) search.set("trash", "1");
  const qs = search.toString();

  const res = await fetch(`/api/admin/blog-posts${qs ? `?${qs}` : ""}`, {
    credentials: "include",
  });
  return parseFetchJson<BlogPostsAdminResponse>(res);
}

export async function fetchBlogPostAdmin(id: string): Promise<BlogPostRecord> {
  const res = await fetch(`/api/admin/blog-posts/${id}`, { credentials: "include" });
  const json = await parseFetchJson<{ post: BlogPostRecord }>(res);
  return json.post;
}

export async function createBlogPostApi(
  input: Record<string, unknown>,
): Promise<BlogPostRecord> {
  const res = await fetch("/api/admin/blog-posts", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ post: BlogPostRecord }>(res);
  return json.post;
}

export async function updateBlogPostApi(
  id: string,
  input: Record<string, unknown>,
): Promise<BlogPostRecord> {
  const res = await fetch(`/api/admin/blog-posts/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ post: BlogPostRecord }>(res);
  return json.post;
}

export async function trashBlogPostApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/blog-posts/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson<{ success: boolean }>(res);
}

/** @deprecated Use trashBlogPostApi */
export async function deleteBlogPostApi(id: string): Promise<void> {
  return trashBlogPostApi(id);
}

export async function restoreBlogPostApi(id: string): Promise<BlogPostRecord> {
  const res = await fetch(`/api/admin/blog-posts/${id}/restore`, {
    method: "POST",
    credentials: "include",
  });
  const json = await parseFetchJson<{ post: BlogPostRecord }>(res);
  return json.post;
}

export async function purgeBlogPostApi(id: string): Promise<void> {
  const res = await fetch(`/api/admin/blog-posts/${id}?permanent=1`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseFetchJson<{ success: boolean }>(res);
}

export async function bulkBlogPostsApi(
  action: "trash" | "restore" | "purge",
  ids: string[],
): Promise<{ affected: number }> {
  const res = await fetch("/api/admin/blog-posts/bulk", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ids }),
  });
  return parseFetchJson<{ affected: number }>(res);
}

export async function uploadBlogImageApi(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/admin/blog-posts/upload", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  return parseFetchJson<{ url: string }>(res);
}

export async function importStaticBlogPostsApi(): Promise<{ imported: number; skipped: number }> {
  const res = await fetch("/api/admin/blog-posts/import-static", {
    method: "POST",
    credentials: "include",
  });
  return parseFetchJson(res);
}

export async function autosaveBlogPostApi(
  id: string,
  input: Record<string, unknown>,
): Promise<BlogPostRecord> {
  const res = await fetch(`/api/admin/blog-posts/${id}/autosave`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseFetchJson<{ post: BlogPostRecord }>(res);
  return json.post;
}

export async function duplicateBlogPostApi(id: string): Promise<BlogPostRecord> {
  const res = await fetch(`/api/admin/blog-posts/${id}/duplicate`, {
    method: "POST",
    credentials: "include",
  });
  const json = await parseFetchJson<{ post: BlogPostRecord }>(res);
  return json.post;
}

export async function fetchBlogPreviewTokenApi(id: string): Promise<string> {
  const res = await fetch(`/api/admin/blog-posts/${id}/preview-token`, {
    credentials: "include",
  });
  const json = await parseFetchJson<{ token: string }>(res);
  return json.token;
}

export type BlogMediaItem = {
  id: string;
  url: string;
  filename: string;
  storage: "s3" | "local";
  byteSize: number | null;
  createdAt: string;
};

export async function fetchBlogMediaApi(limit = 48): Promise<BlogMediaItem[]> {
  const res = await fetch(`/api/admin/blog-posts/media?limit=${limit}`, {
    credentials: "include",
  });
  const json = await parseFetchJson<{ media: BlogMediaItem[] }>(res);
  return json.media;
}

export type BlogRevisionItem = {
  id: string;
  postId: string;
  snapshot: {
    title: string;
    status: string;
  };
  createdByName: string | null;
  createdByEmail: string | null;
  createdAt: string;
};

export async function fetchBlogRevisionsApi(postId: string): Promise<BlogRevisionItem[]> {
  const res = await fetch(`/api/admin/blog-posts/${postId}/revisions`, {
    credentials: "include",
  });
  const json = await parseFetchJson<{ revisions: BlogRevisionItem[] }>(res);
  return json.revisions;
}

export async function restoreBlogRevisionApi(
  postId: string,
  revisionId: string,
): Promise<BlogPostRecord> {
  const res = await fetch(
    `/api/admin/blog-posts/${postId}/revisions/${revisionId}/restore`,
    {
      method: "POST",
      credentials: "include",
    },
  );
  const json = await parseFetchJson<{ post: BlogPostRecord }>(res);
  return json.post;
}
