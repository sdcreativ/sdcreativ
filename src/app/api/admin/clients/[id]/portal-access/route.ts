import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { getAdminSession } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  generateClientPortalAccess,
  getPortalAccessStatus,
  PortalAccessError,
  resendClientPortalAccess,
  revokeClientPortalAccess,
} from "@/lib/client-portal-access";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const actionSchema = z.object({
  action: z.enum(["generate", "resend", "revoke"]),
  sendEmail: z.boolean().optional(),
});

export async function GET(_request: Request, context: RouteContext) {
  const authError = await crmApiAuth.clients.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const status = await getPortalAccessStatus(id);
    return NextResponse.json({ status });
  } catch (error) {
    if (error instanceof PortalAccessError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[api/admin/clients/portal-access] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const authError = await crmApiAuth.clients.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const session = await getAdminSession();
    const body = await request.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Action invalide." }, { status: 400 });
    }

    const actor = session
      ? {
          userId: session.userId === "legacy" ? null : session.userId,
          name: session.name,
          email: session.email,
        }
      : { userId: null, name: "Administrateur", email: null };

    if (parsed.data.action === "generate") {
      const result = await generateClientPortalAccess({
        clientId: id,
        actor,
        sendEmail: parsed.data.sendEmail,
      });
      return NextResponse.json({
        success: true,
        status: await getPortalAccessStatus(id),
        client: result.client,
        portalClientId: result.portalClientId,
        plainToken: result.plainToken,
        emailSent: result.emailSent,
      });
    }

    if (parsed.data.action === "resend") {
      const result = await resendClientPortalAccess({ clientId: id, actor });
      return NextResponse.json({
        success: true,
        status: await getPortalAccessStatus(id),
        client: result.client,
        portalClientId: result.portalClientId,
        plainToken: result.plainToken,
        emailSent: result.emailSent,
      });
    }

    const client = await revokeClientPortalAccess({ clientId: id, actor });
    return NextResponse.json({
      success: true,
      status: await getPortalAccessStatus(id),
      client,
    });
  } catch (error) {
    if (error instanceof PortalAccessError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[api/admin/clients/portal-access] POST", error);
    return NextResponse.json({ error: "Action impossible." }, { status: 500 });
  }
}
