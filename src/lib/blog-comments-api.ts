import type { BlogCommentRecord, BlogCommentStatus } from "@/lib/blog-comments";
import { parseFetchJson } from "@/lib/fetch-json";

export async function fetchBlogCommentsAdmin(
  status: BlogCommentStatus = "pending",
): Promise<{ comments: BlogCommentRecord[]; pendingCount: number }> {
  const res = await fetch(`/api/admin/blog-comments?status=${status}`, {
    credentials: "include",
  });
  return parseFetchJson(res);
}

export async function moderateBlogCommentApi(
  id: string,
  status: "approved" | "rejected" | "spam",
): Promise<BlogCommentRecord> {
  const res = await fetch(`/api/admin/blog-comments/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const json = await parseFetchJson<{ comment: BlogCommentRecord }>(res);
  return json.comment;
}
