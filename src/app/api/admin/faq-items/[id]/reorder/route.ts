import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { reorderPublicFaqItem } from "@/lib/public-faq-items";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidateFaqPages } from "@/lib/site-revalidate";

type Props = { params: Promise<{ id: string }> };

const reorderSchema = z.object({ direction: z.enum(["up", "down"]) });

export async function POST(request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }

    const item = await reorderPublicFaqItem(id, parsed.data.direction);
    if (!item) {
      return NextResponse.json({ error: "Question introuvable." }, { status: 404 });
    }

    revalidateFaqPages();
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Réordonnancement impossible.";
    console.error("[api/admin/faq-items/id/reorder] POST", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
