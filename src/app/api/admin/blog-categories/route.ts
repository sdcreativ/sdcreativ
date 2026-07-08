import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import {
  createBlogCategory,
  createBlogCategorySchema,
  listBlogCategories,
} from "@/lib/blog-categories";
import { isDatabaseConfigured } from "@/lib/db";

export async function GET() {
  const authError = await crmApiAuth.blog.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const categories = await listBlogCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("[api/admin/blog-categories] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.blog.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createBlogCategorySchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const category = await createBlogCategory(parsed.data);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Création impossible.";
    console.error("[api/admin/blog-categories] POST", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
