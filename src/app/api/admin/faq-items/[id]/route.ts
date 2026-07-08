import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import {
  deletePublicFaqItem,
  updatePublicFaqItem,
  updatePublicFaqItemSchema,
} from "@/lib/public-faq-items";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidateFaqPages } from "@/lib/site-revalidate";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updatePublicFaqItemSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const item = await updatePublicFaqItem(id, parsed.data);
    if (!item) {
      return NextResponse.json({ error: "Question introuvable." }, { status: 404 });
    }

    revalidateFaqPages();
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mise à jour impossible.";
    console.error("[api/admin/faq-items/id] PATCH", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const deleted = await deletePublicFaqItem(id);
    if (!deleted) {
      return NextResponse.json({ error: "Question introuvable." }, { status: 404 });
    }

    revalidateFaqPages();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Suppression impossible.";
    console.error("[api/admin/faq-items/id] DELETE", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
