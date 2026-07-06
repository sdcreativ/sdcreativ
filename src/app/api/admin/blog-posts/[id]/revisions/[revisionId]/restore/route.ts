import { NextResponse } from "next/server";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { revalidateBlogPaths } from "@/lib/blog-revalidate";
import { getBlogPostById } from "@/lib/blog-posts";
import { restoreBlogRevision } from "@/lib/blog-revisions";
import { isDatabaseConfigured } from "@/lib/db";

type Props = {
  params: Promise<{ id: string; revisionId: string }>;
};

export async function POST(_request: Request, { params }: Props) {
  const authError = await requireAdminAuth({ write: true });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id, revisionId } = await params;
    const existing = await getBlogPostById(id);
    if (!existing) {
      return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    }

    const session = await getAdminSession();
    const post = await restoreBlogRevision(id, revisionId, {
      name: session?.name,
      email: session?.email,
    });

    if (!post) {
      return NextResponse.json({ error: "Révision introuvable." }, { status: 404 });
    }

    revalidateBlogPaths(existing.slug);
    if (post.slug !== existing.slug) {
      revalidateBlogPaths(post.slug);
    }

    return NextResponse.json({ post });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Restauration impossible.";
    console.error("[api/admin/blog-posts/id/revisions/revisionId/restore] POST", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
