import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { listArchivedProjectBundles } from "@/lib/projects/archive";
import { listProjectsPaginated } from "@/lib/projects";
import { listQuotesFiltered } from "@/lib/quotes";
import { listInvoices } from "@/lib/invoices";

export async function GET() {
  const authError = await crmApiAuth.projects.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const [bundles, projectsResult, quotes, invoices] = await Promise.all([
      listArchivedProjectBundles(),
      listProjectsPaginated({ archived: true, pageSize: 100 }),
      listQuotesFiltered({ archived: true }),
      listInvoices({ archived: true }),
    ]);

    return NextResponse.json({
      bundles,
      projects: projectsResult.projects,
      quotes,
      invoices,
    });
  } catch (error) {
    console.error("[api/admin/archives] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
