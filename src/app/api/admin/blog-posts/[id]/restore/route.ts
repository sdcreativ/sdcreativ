import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { revalidateBlogPaths } from "@/lib/blog-revalidate";
import { restoreBlogPost } from "@/lib/blog-posts";
import { isDatabaseConfigured } from "@/lib/db";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: Props) {
  const authError = await requireAdminAuth({ write: true });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const post = await restoreBlogPost(id);
    if (!post) {
      return NextResponse.json({ error: "Article introuvable dans la corbeille." }, { status: 404 });
    }

    if (post.status === "published") {
      revalidateBlogPaths(post.slug);
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("[api/admin/blog-posts/id/restore] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
