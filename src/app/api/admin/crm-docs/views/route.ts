import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { z } from "zod";
import { incrementCrmDocView, listTopCrmDocViews } from "@/lib/crm-docs-analytics";

export async function GET(request: Request) {
  const authError = await crmApiAuth.docs.read();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 10) || 10, 30);

  try {
    const top = await listTopCrmDocViews(limit);
    return NextResponse.json({ top });
  } catch (error) {
    console.error("[api/admin/crm-docs/views] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

const postSchema = z.object({
  slug: z.string().trim().min(1).max(80),
});

export async function POST(request: Request) {
  const authError = await crmApiAuth.docs.read();
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Slug requis." }, { status: 400 });
    }
    const viewCount = await incrementCrmDocView(parsed.data.slug);
    return NextResponse.json({ viewCount });
  } catch (error) {
    console.error("[api/admin/crm-docs/views] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
