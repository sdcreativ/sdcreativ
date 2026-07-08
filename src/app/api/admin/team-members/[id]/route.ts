import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import {
  deletePublicTeamMember,
  getPublicTeamMemberById,
  updatePublicTeamMember,
  updatePublicTeamMemberSchema,
} from "@/lib/public-team-members";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidateTeamPages } from "@/lib/site-revalidate";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const member = await getPublicTeamMemberById(id);
    if (!member) {
      return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
    }
    return NextResponse.json({ member });
  } catch (error) {
    console.error("[api/admin/team-members/id] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updatePublicTeamMemberSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const member = await updatePublicTeamMember(id, parsed.data);
    if (!member) {
      return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
    }

    revalidateTeamPages();
    return NextResponse.json({ member });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mise à jour impossible.";
    console.error("[api/admin/team-members/id] PATCH", error);
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
    const deleted = await deletePublicTeamMember(id);
    if (!deleted) {
      return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
    }

    revalidateTeamPages();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Suppression impossible.";
    console.error("[api/admin/team-members/id] DELETE", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
