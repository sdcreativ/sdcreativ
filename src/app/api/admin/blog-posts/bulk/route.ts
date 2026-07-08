import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidateBlogPaths } from "@/lib/blog-revalidate";
import { bulkBlogPostAction } from "@/lib/blog-posts";
import { isDatabaseConfigured } from "@/lib/db";

const bulkSchema = z.object({
  action: z.enum(["trash", "restore", "purge"]),
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(request: Request) {
  const authError = await crmApiAuth.blog.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = bulkSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { action, ids } = parsed.data;
    const { affected } = await bulkBlogPostAction(ids, action);

    if (affected > 0 && (action === "trash" || action === "restore")) {
      revalidateBlogPaths();
    }

    if (affected > 0 && action === "purge") {
      revalidateBlogPaths();
    }

    return NextResponse.json({ affected });
  } catch (error) {
    console.error("[api/admin/blog-posts/bulk] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
