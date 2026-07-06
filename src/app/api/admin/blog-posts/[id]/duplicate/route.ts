import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { duplicateBlogPost } from "@/lib/blog-posts";
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
    const post = await duplicateBlogPost(id);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Duplication impossible.";
    console.error("[api/admin/blog-posts/id/duplicate] POST", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
