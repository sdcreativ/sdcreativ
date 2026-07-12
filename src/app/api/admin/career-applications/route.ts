import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  listCareerApplications,
  updateCareerApplicationStatus,
} from "@/lib/career-applications";
import { CAREER_APPLICATION_STATUSES } from "@/content/priority3-labels";

export async function GET(request: Request) {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const applications = await listCareerApplications({
    status: (searchParams.get("status") as never) ?? undefined,
    jobId: searchParams.get("jobId") ?? undefined,
  });
  return NextResponse.json({ applications });
}

export async function PATCH(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }
  const body = await request.json();
  const id = String(body.id ?? "");
  const status = body.status;
  if (!id || !CAREER_APPLICATION_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }
  const application = await updateCareerApplicationStatus(id, status);
  if (!application) {
    return NextResponse.json({ error: "Candidature introuvable." }, { status: 404 });
  }
  return NextResponse.json({ application });
}
