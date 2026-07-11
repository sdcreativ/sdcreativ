import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CLIENT_ID_COOKIE,
  CLIENT_TOKEN_COOKIE,
  getClientSessionFromCookies,
  validateClientCredentials,
} from "@/lib/documents-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getClientByPortalId } from "@/lib/clients";
import {
  generatePortalAccessToken,
  hashPortalAccessToken,
} from "@/lib/client-portal-access";

const bodySchema = z.object({
  currentToken: z.string().trim().min(8).max(256),
});

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Code actuel invalide." }, { status: 400 });
    }

    const { currentToken } = parsed.data;
    const valid = await validateClientCredentials(session.loginClientId, currentToken);
    if (!valid) {
      return NextResponse.json({ error: "Code d'accès actuel incorrect." }, { status: 401 });
    }

    const client = await getClientByPortalId(session.crmPortalId);
    if (!client) {
      return NextResponse.json(
        { error: "Compte non lié au CRM. Contactez SD CREATIV pour modifier votre code." },
        { status: 404 },
      );
    }

    const plainToken = generatePortalAccessToken();
    const tokenHash = hashPortalAccessToken(plainToken);

    const { withDb } = await import("@/lib/db");
    await withDb(async (query) => {
      await query(
        `UPDATE clients SET
          portal_access_token_hash = $2,
          portal_access_created_at = NOW(),
          updated_at = NOW()
        WHERE id = $1`,
        [client.id, tokenHash],
      );
    });

    const response = NextResponse.json({ accessCode: plainToken });
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      path: "/",
      maxAge: 60 * 60 * 8,
    };
    response.cookies.set(CLIENT_ID_COOKIE, session.loginClientId, cookieOptions);
    response.cookies.set(CLIENT_TOKEN_COOKIE, plainToken, cookieOptions);

    return response;
  } catch (error) {
    console.error("[api/espace-client/settings/access-code] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
