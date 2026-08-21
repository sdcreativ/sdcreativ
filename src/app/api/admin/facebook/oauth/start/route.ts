import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import {
  buildFacebookAuthorizeUrl,
  isMetaFacebookOAuthConfigured,
} from "@/lib/facebook-oauth-config";
import { signFacebookOAuthState } from "@/lib/facebook-oauth-state";

export async function GET() {
  const authError = await crmApiAuth.settings.write();
  if (authError) return authError;

  if (!isMetaFacebookOAuthConfigured()) {
    return NextResponse.json(
      { error: "OAuth Facebook non configuré (META_APP_ID / META_APP_SECRET)." },
      { status: 503 },
    );
  }

  const session = await getAdminSession();
  if (!session?.userId || session.userId === "legacy") {
    return NextResponse.json(
      { error: "Compte CRM requis pour connecter Facebook." },
      { status: 400 },
    );
  }

  try {
    const state = signFacebookOAuthState(session.userId);
    return NextResponse.redirect(buildFacebookAuthorizeUrl(state));
  } catch (error) {
    console.error("[api/admin/facebook/oauth/start] GET", error);
    return NextResponse.json({ error: "Impossible de démarrer OAuth Facebook." }, { status: 500 });
  }
}
