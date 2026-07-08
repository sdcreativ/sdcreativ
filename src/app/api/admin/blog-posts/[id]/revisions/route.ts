import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { getBlogPostById } from "@/lib/blog-posts";
import { listBlogRevisions } from "@/lib/blog-revisions";
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
    const post = await getBlogPostById(id);
    if (!post) {
      return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    }

    const revisions = await listBlogRevisions(id);
    return NextResponse.json({ revisions });
  } catch (error) {
    console.error("[api/admin/blog-posts/id/revisions] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
