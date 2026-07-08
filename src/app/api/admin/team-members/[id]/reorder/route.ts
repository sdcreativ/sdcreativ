import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { reorderPublicTeamMember } from "@/lib/public-team-members";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidateTeamPages } from "@/lib/site-revalidate";

type Props = {
  params: Promise<{ id: string }>;
};

const reorderSchema = z.object({
  direction: z.enum(["up", "down"]),
});

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
      const message = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const member = await reorderPublicTeamMember(id, parsed.data.direction);
    if (!member) {
      return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
    }

    revalidateTeamPages();
    return NextResponse.json({ member });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Réordonnancement impossible.";
    console.error("[api/admin/team-members/id/reorder] POST", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
