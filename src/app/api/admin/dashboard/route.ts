import { NextResponse } from "next/server";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getDashboardSnapshot } from "@/lib/dashboard";
import { DASHBOARD_PERIODS, type DashboardPeriod } from "@/content/reports-labels";
import {
  filterDashboardActivities,
  filterDashboardKpis,
  hasCrmPermission,
} from "@/lib/crm-access";
import { getRolePermissions } from "@/lib/crm-permissions";

export async function GET(request: Request) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("period") ?? "month";
    const period = (DASHBOARD_PERIODS.includes(raw as DashboardPeriod)
      ? raw
      : "month") as DashboardPeriod;
    const assignee = searchParams.get("assignee")?.trim() || undefined;
    const clientId = searchParams.get("clientId")?.trim() || undefined;

    const permissions = getRolePermissions(session.role);
    const canReports = hasCrmPermission(permissions, "reports.view");
    const canLeads = hasCrmPermission(permissions, "leads.read");
    const canTasks = hasCrmPermission(permissions, "tasks.read");
    const canProjects = hasCrmPermission(permissions, "projects.read");
    const canQuotes = hasCrmPermission(permissions, "quotes.read");

    const snapshot = await getDashboardSnapshot(
      period,
      { assignee, clientId },
      {
        includeReports: canReports,
        includePipeline: canLeads,
        includeTasks: canTasks,
        includeProjects: canProjects,
        includeActivities: canLeads || canProjects || canQuotes || canTasks,
      },
    );

    return NextResponse.json({
      kpis: filterDashboardKpis(snapshot.kpis, permissions),
      reports: snapshot.reports,
      pipeline: snapshot.pipeline,
      openTasks: snapshot.openTasks,
      recentProjects: snapshot.recentProjects,
      activities: filterDashboardActivities(snapshot.activities, permissions),
    });
  } catch (error) {
    console.error("[api/admin/dashboard] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
