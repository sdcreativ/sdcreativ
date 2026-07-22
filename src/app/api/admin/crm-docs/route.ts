import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { createCrmDocPage, listCrmDocPages } from "@/lib/crm-docs";
import { createCrmDocPageSchema } from "@/lib/crm-docs-types";
import { seedCrmDocCategories } from "@/lib/crm-docs-categories";
import { roleHasPermission } from "@/lib/crm-permissions";

export async function GET(request: Request) {
  const authError = await crmApiAuth.docs.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ pages: [] });
  }

  try {
    await seedCrmDocCategories();
    const session = await getAdminSession();
    const canWrite = session ? roleHasPermission(session.role, "docs.write") : false;
    const { searchParams } = new URL(request.url);
    const pages = await listCrmDocPages({
      includeDeleted: canWrite && searchParams.get("trash") === "1",
      status: canWrite ? undefined : "published",
    });
    return NextResponse.json({ pages });
  } catch (error) {
    console.error("[api/admin/crm-docs] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.docs.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createCrmDocPageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const page = await createCrmDocPage(parsed.data);
    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/crm-docs] POST", error);
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
