import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { ensureCrmDocPageBySlug } from "@/lib/crm-docs";

export async function POST(request: Request) {
  const authError = await crmApiAuth.docs.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const body = (await request.json().catch(() => null)) as { slug?: unknown } | null;
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      return NextResponse.json({ error: "Slug requis." }, { status: 400 });
    }

    const page = await ensureCrmDocPageBySlug(slug);
    return NextResponse.json({ page });
  } catch (error) {
    console.error("[api/admin/crm-docs/ensure]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Création impossible." },
      { status: 500 },
    );
  }
}
