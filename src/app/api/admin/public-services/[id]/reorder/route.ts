import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { reorderPublicService } from "@/lib/public-services";
import { revalidateServicesPages } from "@/lib/site-revalidate";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  direction: z.enum(["up", "down"]),
});

export async function POST(request: Request, { params }: Params) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Direction invalide." }, { status: 400 });
    }

    const item = await reorderPublicService(id, parsed.data.direction);
    if (!item) return NextResponse.json({ error: "Service introuvable." }, { status: 404 });

    revalidateServicesPages();
    return NextResponse.json({ item });
  } catch (error) {
    console.error("[api/admin/public-services/[id]/reorder] POST", error);
    return NextResponse.json({ error: "Réordonnancement impossible." }, { status: 500 });
  }
}
