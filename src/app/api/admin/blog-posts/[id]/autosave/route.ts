import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { autosaveBlogPost, autosaveBlogPostSchema } from "@/lib/blog-posts";
import { isDatabaseConfigured } from "@/lib/db";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Props) {
  const authError = await crmApiAuth.blog.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = autosaveBlogPostSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const post = await autosaveBlogPost(id, parsed.data);
    if (!post) {
      return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    }

    return NextResponse.json({ post, autosaved: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    console.error("[api/admin/blog-posts/id/autosave] PATCH", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
