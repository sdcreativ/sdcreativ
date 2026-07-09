import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createPublicService,
  createPublicServiceSchema,
  listPublicServices,
} from "@/lib/public-services";
import { revalidateServicesPages } from "@/lib/site-revalidate";
import { NextResponse } from "next/server";

export async function GET() {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const items = await listPublicServices();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[api/admin/public-services] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createPublicServiceSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const item = await createPublicService(parsed.data);
    revalidateServicesPages(item.slug);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Création impossible.";
    console.error("[api/admin/public-services] POST", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
