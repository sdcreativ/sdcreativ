import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { revalidateBlogPaths } from "@/lib/blog-revalidate";
import {
  createBlogPost,
  createBlogPostSchema,
  countTrashedBlogPosts,
  listBlogPosts,
} from "@/lib/blog-posts";
import { isDatabaseConfigured } from "@/lib/db";
import type { BlogPostStatus } from "@/content/blog-labels";

export async function GET(request: Request) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as BlogPostStatus | null;
    const q = searchParams.get("q");
    const tag = searchParams.get("tag");
    const trash = searchParams.get("trash") === "1" || searchParams.get("trash") === "true";

    const posts = await listBlogPosts({
      status: trash ? undefined : (status ?? undefined),
      q: q ?? undefined,
      tag: tag ?? undefined,
      trash,
    });

    const trashCount = await countTrashedBlogPosts();

    return NextResponse.json({ posts, trashCount });
  } catch (error) {
    console.error("[api/admin/blog-posts] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await requireAdminAuth({ write: true });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createBlogPostSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const post = await createBlogPost(parsed.data);

    if (post.status === "published") {
      revalidateBlogPaths(post.slug);
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    const friendly =
      message.includes("invalid input syntax for type json") ||
      message.includes("json")
        ? "Erreur de format des données. Réessayez ou contactez le support."
        : message;
    console.error("[api/admin/blog-posts] POST", error);
    return NextResponse.json({ error: friendly }, { status: 400 });
  }
}
