import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createClient,
  createClientFromLead,
  createClientSchema,
  listClientsPaginated,
  type ClientListFilters,
} from "@/lib/clients";
import { CLIENT_STATUSES, type ClientStatus } from "@/content/clients-labels";

export async function GET(request: Request) {
  const authError = await crmApiAuth.clients.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Base de données non configurée (DATABASE_URL)." },
      { status: 503 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ClientStatus | null;
    const accountManager = searchParams.get("accountManager")?.trim() || undefined;
    const sector = searchParams.get("sector")?.trim() || undefined;
    const tag = searchParams.get("tag")?.trim() || undefined;
    const q = searchParams.get("q")?.trim() || undefined;
    const revenueMin = searchParams.get("revenueMin") ? Number(searchParams.get("revenueMin")) : undefined;
    const revenueMax = searchParams.get("revenueMax") ? Number(searchParams.get("revenueMax")) : undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
    const pageSize = searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined;

    const filters: ClientListFilters = {
      status: status && CLIENT_STATUSES.includes(status) ? status : undefined,
      accountManager,
      sector,
      tag,
      q,
      revenueMin: revenueMin && !Number.isNaN(revenueMin) ? revenueMin : undefined,
      revenueMax: revenueMax && !Number.isNaN(revenueMax) ? revenueMax : undefined,
      page,
      pageSize,
    };

    const result = await listClientsPaginated(filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/admin/clients] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.clients.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();

    if (body.leadId && !body.name) {
      const client = await createClientFromLead(String(body.leadId));
      if (!client) {
        return NextResponse.json({ error: "Lead introuvable." }, { status: 404 });
      }
      return NextResponse.json({ client }, { status: 201 });
    }

    const parsed = createClientSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const client = await createClient(parsed.data);
    void import("@/lib/crm-webhooks").then(({ dispatchCrmWebhook }) =>
      dispatchCrmWebhook("client.created", {
        clientId: client.id,
        name: client.name,
        email: client.email,
        company: client.company,
      }),
    );
    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/clients] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
