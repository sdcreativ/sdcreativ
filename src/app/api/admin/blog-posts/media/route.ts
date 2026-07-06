import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { listBlogMedia } from "@/lib/blog-media-library";
import { isDatabaseConfigured } from "@/lib/db";

export async function GET(request: Request) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "48");
    const media = await listBlogMedia(limit);
    return NextResponse.json({ media });
  } catch (error) {
    console.error("[api/admin/blog-posts/media] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
