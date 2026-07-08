import { getAdminSession } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { revalidateBlogPaths } from "@/lib/blog-revalidate";
import {
  getBlogPostById,
  getOrCreatePreviewToken,
  purgeBlogPost,
  trashBlogPost,
  updateBlogPost,
  updateBlogPostSchema,
} from "@/lib/blog-posts";
import { isDatabaseConfigured } from "@/lib/db";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.blog.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    let post = await getBlogPostById(id);
    if (!post) {
      return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    }
    if (!post.previewToken) {
      const token = await getOrCreatePreviewToken(id);
      if (token) post = { ...post, previewToken: token };
    }
    return NextResponse.json({ post });
  } catch (error) {
    console.error("[api/admin/blog-posts/id] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Props) {
  const authError = await crmApiAuth.blog.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const existing = await getBlogPostById(id);
    if (!existing) {
      return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateBlogPostSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const session = await getAdminSession();
    const post = await updateBlogPost(id, parsed.data, {
      author: session ? { name: session.name, email: session.email } : undefined,
    });
    if (!post) {
      return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    }

    revalidateBlogPaths(existing.slug);
    if (post.slug !== existing.slug) {
      revalidateBlogPaths(post.slug);
    }

    return NextResponse.json({ post });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    console.error("[api/admin/blog-posts/id] PATCH", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: Props) {
  const authError = await crmApiAuth.blog.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permanent =
      searchParams.get("permanent") === "1" || searchParams.get("permanent") === "true";

    const deleted = permanent ? await purgeBlogPost(id) : await trashBlogPost(id);
    if (!deleted) {
      return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    }

    revalidateBlogPaths(deleted.slug);

    return NextResponse.json({ success: true, post: deleted });
  } catch (error) {
    console.error("[api/admin/blog-posts/id] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
