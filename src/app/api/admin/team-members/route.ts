import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import {
  createPublicTeamMember,
  createPublicTeamMemberSchema,
  listPublicTeamMembers,
} from "@/lib/public-team-members";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidateTeamPages } from "@/lib/site-revalidate";

export async function GET(request: Request) {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get("locale") ?? undefined;
    const members = await listPublicTeamMembers({ locale });
    return NextResponse.json({ members });
  } catch (error) {
    console.error("[api/admin/team-members] GET", error);
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
    const parsed = createPublicTeamMemberSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const member = await createPublicTeamMember(parsed.data);
    revalidateTeamPages();
    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Création impossible.";
    console.error("[api/admin/team-members] POST", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
