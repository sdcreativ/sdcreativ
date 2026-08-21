import { NextResponse } from "next/server";
import {
  exchangeFacebookCode,
  exchangeLongLivedUserToken,
  guessPreferredFacebookPageId,
  listFacebookPagesForUser,
  saveFacebookPageConnection,
} from "@/lib/facebook-page";
import { verifyFacebookOAuthState } from "@/lib/facebook-oauth-state";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const redirectBase = new URL("/admin/crm/parametres", request.url);
  redirectBase.searchParams.set("tab", "site");

  if (oauthError || !code || !state) {
    redirectBase.searchParams.set("facebook", "error");
    return NextResponse.redirect(redirectBase);
  }

  const payload = verifyFacebookOAuthState(state);
  if (!payload) {
    redirectBase.searchParams.set("facebook", "state");
    return NextResponse.redirect(redirectBase);
  }

  try {
    const shortLived = await exchangeFacebookCode(code);
    const longLived = await exchangeLongLivedUserToken(shortLived.accessToken);
    const pages = await listFacebookPagesForUser(longLived.accessToken);

    if (pages.length === 0) {
      redirectBase.searchParams.set("facebook", "no_pages");
      return NextResponse.redirect(redirectBase);
    }

    const summaries = pages.map((p) => ({ id: p.id, name: p.name }));
    const preferredId =
      guessPreferredFacebookPageId(summaries) ?? pages[0]!.id;
    const chosen = pages.find((p) => p.id === preferredId) ?? pages[0]!;

    const expiresAt =
      longLived.expiresIn != null
        ? new Date(Date.now() + longLived.expiresIn * 1000)
        : null;

    await saveFacebookPageConnection({
      pageId: chosen.id,
      pageName: chosen.name,
      pageAccessToken: chosen.access_token,
      userAccessToken: longLived.accessToken,
      tokenExpiresAt: expiresAt,
      availablePages: summaries,
      connectedBy: payload.userId,
    });

    redirectBase.searchParams.set(
      "facebook",
      pages.length > 1 && !guessPreferredFacebookPageId(summaries)
        ? "choose"
        : "connected",
    );
    return NextResponse.redirect(redirectBase);
  } catch (error) {
    console.error("[api/admin/facebook/oauth/callback] GET", error);
    redirectBase.searchParams.set("facebook", "error");
    return NextResponse.redirect(redirectBase);
  }
}
