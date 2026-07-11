import { NextResponse } from "next/server";
import { buildClientProfileAsync } from "@/lib/client-portal-db";
import {
  parseClientPortalConfig,
} from "@/lib/client-portal-config";
import { validatePortalAccessCredentials } from "@/lib/client-portal-access";
import { isDatabaseConfigured } from "@/lib/db";
import {
  CLIENT_ID_COOKIE,
  CLIENT_TOKEN_COOKIE,
} from "@/lib/documents-auth";
import { z } from "zod";

const loginSchema = z.object({
  clientId: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/),
  token: z.string().trim().min(8).max(256),
});

export async function POST(request: Request) {
  const envConfig = parseClientPortalConfig();
  if (!isDatabaseConfigured() && Object.keys(envConfig).length === 0) {
    return NextResponse.json(
      { error: "Espace client non configuré." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Identifiant ou code d'accès invalide." },
        { status: 400 },
      );
    }

    const { clientId, token } = parsed.data;

    const valid = await validatePortalAccessCredentials(clientId, token);
    if (!valid) {
      return NextResponse.json(
        { error: "Identifiant ou code d'accès incorrect." },
        { status: 401 },
      );
    }

    const profile = await buildClientProfileAsync(clientId);

    const response = NextResponse.json({
      success: true,
      clientId,
      profile,
    });
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      path: "/",
      maxAge: 60 * 60 * 8,
    };

    response.cookies.set(CLIENT_ID_COOKIE, clientId, cookieOptions);
    response.cookies.set(CLIENT_TOKEN_COOKIE, token, cookieOptions);

    return response;
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(CLIENT_ID_COOKIE);
  response.cookies.delete(CLIENT_TOKEN_COOKIE);
  return response;
}
