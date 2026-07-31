import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { deleteBlogMedia, getBlogMediaById } from "@/lib/blog-media-library";
import { isDatabaseConfigured } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const authError = await crmApiAuth.blog.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Identifiant requis." }, { status: 400 });
    }

    const existing = await getBlogMediaById(id);
    if (!existing) {
      return NextResponse.json({ error: "Média introuvable." }, { status: 404 });
    }

    const ok = await deleteBlogMedia(id);
    if (!ok) {
      return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/blog-posts/media/[id]] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
