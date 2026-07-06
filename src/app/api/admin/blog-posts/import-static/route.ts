import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { revalidateBlogPaths } from "@/lib/blog-revalidate";
import { importStaticBlogPosts } from "@/lib/blog-posts";
import { isDatabaseConfigured } from "@/lib/db";

export async function POST() {
  const authError = await requireAdminAuth({ write: true });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const result = await importStaticBlogPosts();
    revalidateBlogPaths();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/admin/blog-posts/import-static]", error);
    return NextResponse.json({ error: "Import impossible." }, { status: 500 });
  }
}
