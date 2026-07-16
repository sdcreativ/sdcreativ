import { NextResponse } from "next/server";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { dismissMailboxOnboarding } from "@/lib/crm-users";

/** Masque le bandeau « accéder à la boîte mail pro » après la 1ʳᵉ connexion. */
export async function POST() {
  const authError = await requireAdminAuth({ allowPasswordChange: true });
  if (authError) return authError;

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    await dismissMailboxOnboarding(session.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/account/mailbox-onboarding] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
