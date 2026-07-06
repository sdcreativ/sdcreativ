import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  countPendingBlogComments,
  listBlogCommentsForModeration,
  type BlogCommentStatus,
} from "@/lib/blog-comments";
import { isDatabaseConfigured } from "@/lib/db";

export async function GET(request: Request) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") ?? "pending") as BlogCommentStatus;
    const [comments, pendingCount] = await Promise.all([
      listBlogCommentsForModeration(status),
      countPendingBlogComments(),
    ]);
    return NextResponse.json({ comments, pendingCount });
  } catch (error) {
    console.error("[api/admin/blog-comments] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
