import { NextResponse } from "next/server";
import { acceptInvitation, acceptInvitationSchema, validateInviteToken } from "@/lib/crm-users";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Token requis." }, { status: 400 });
  }

  try {
    const validation = await validateInviteToken(token);
    return NextResponse.json(validation);
  } catch (error) {
    console.error("[api/admin/invitation] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = acceptInvitationSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const result = await acceptInvitation(parsed.data.token, parsed.data.password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Activation impossible." }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (error) {
    console.error("[api/admin/invitation] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
