import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  addCrmDocFavorite,
  listCrmDocFavoriteSlugs,
  removeCrmDocFavorite,
} from "@/lib/crm-docs-favorites";

export async function GET() {
  const authError = await crmApiAuth.docs.read();
  if (authError) return authError;

  const session = await getAdminSession();
  if (!session?.userId || session.userId === "legacy") {
    return NextResponse.json({ slugs: [] });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ slugs: [] });
  }

  try {
    const slugs = await listCrmDocFavoriteSlugs(session.userId);
    return NextResponse.json({ slugs });
  } catch (error) {
    console.error("[api/admin/crm-docs/favorites] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.docs.read();
  if (authError) return authError;

  const session = await getAdminSession();
  if (!session?.userId || session.userId === "legacy") {
    return NextResponse.json({ error: "Session invalide." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { slug?: string; action?: "add" | "remove" };
    const slug = body.slug?.trim();
    if (!slug) {
      return NextResponse.json({ error: "Slug requis." }, { status: 400 });
    }

    if (body.action === "remove") {
      const slugs = await removeCrmDocFavorite(session.userId, slug);
      return NextResponse.json({ slugs });
    }

    const result = await addCrmDocFavorite(session.userId, slug);
    if (result.error) {
      return NextResponse.json({ slugs: result.slugs, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ slugs: result.slugs });
  } catch (error) {
    console.error("[api/admin/crm-docs/favorites] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
