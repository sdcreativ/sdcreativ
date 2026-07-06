import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getOrCreatePreviewToken } from "@/lib/blog-posts";
import { isDatabaseConfigured } from "@/lib/db";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const token = await getOrCreatePreviewToken(id);
    if (!token) {
      return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    }
    return NextResponse.json({ token });
  } catch (error) {
    console.error("[api/admin/blog-posts/id/preview-token] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
