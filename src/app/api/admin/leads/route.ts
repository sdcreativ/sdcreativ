import { NextResponse } from "next/server";
import { requireAdminAuth, getAdminSession } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  countLeadsByStatus,
  createLead,
  createLeadSchema,
  listLeadsPaginated,
  LEAD_SOURCES,
  LEAD_STATUSES,
  type LeadSource,
  type LeadStatus,
} from "@/lib/leads";

export async function GET(request: Request) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Base de données non configurée (DATABASE_URL)." },
      { status: 503 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as LeadStatus | null;
    const source = searchParams.get("source") as LeadSource | null;
    const countsOnly = searchParams.get("counts") === "1";

    if (countsOnly) {
      const counts = await countLeadsByStatus();
      return NextResponse.json({ counts });
    }

    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
    const pageSize = searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined;
    const assignee = searchParams.get("assignee")?.trim() || undefined;
    const q = searchParams.get("q")?.trim() || undefined;
    const dateFrom = searchParams.get("dateFrom")?.trim() || undefined;
    const dateTo = searchParams.get("dateTo")?.trim() || undefined;
    const budgetMin = searchParams.get("budgetMin") ? Number(searchParams.get("budgetMin")) : undefined;

    const result = await listLeadsPaginated({
      status: status && LEAD_STATUSES.includes(status) ? status : undefined,
      source: source && LEAD_SOURCES.includes(source) ? source : undefined,
      assignee,
      q,
      dateFrom,
      dateTo,
      budgetMin: budgetMin && !Number.isNaN(budgetMin) ? budgetMin : undefined,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/admin/leads] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Base de données non configurée (DATABASE_URL)." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const parsed = createLeadSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const data = parsed.data;
    const session = await getAdminSession();
    const lead = await createLead({
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      source: data.source,
      status: data.status,
      service: data.service,
      budget: data.budget,
      timeline: data.timeline,
      message: data.message,
      estimatedValue: data.estimatedValue,
      assignee: data.assignee,
      actorName: session?.name ?? null,
      metadata: data.metadata,
    });

    if (!lead) {
      return NextResponse.json({ error: "Impossible de créer le lead." }, { status: 500 });
    }

    void import("@/lib/crm-webhooks").then(({ dispatchCrmWebhook }) =>
      dispatchCrmWebhook("lead.created", {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        source: lead.source,
        title: lead.name,
      }),
    );

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/leads] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
