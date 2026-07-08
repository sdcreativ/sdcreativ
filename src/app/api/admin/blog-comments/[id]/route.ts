import { getAdminSession } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { revalidateBlogPaths } from "@/lib/blog-revalidate";
import { moderateBlogComment, moderateBlogCommentSchema } from "@/lib/blog-comments";
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
    const parsed = moderateBlogCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }

    const session = await getAdminSession();
    const comment = await moderateBlogComment(
      id,
      parsed.data.status,
      session?.name,
    );

    if (!comment) {
      return NextResponse.json({ error: "Commentaire introuvable." }, { status: 404 });
    }

    if (comment.postSlug) {
      revalidateBlogPaths(comment.postSlug);
    }

    return NextResponse.json({ comment });
  } catch (error) {
    console.error("[api/admin/blog-comments/id] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
