import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { listProjects } from "@/lib/projects";
import { buildProjectsCsv, buildProjectsPdfHtml } from "@/lib/projects-export";

export async function GET(request: Request) {
  const authError = await requireAdminAuth({ permission: "projects.read" });
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "csv";
    const projects = await listProjects();

    if (format === "pdf") {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
      const html = buildProjectsPdfHtml(projects, siteUrl);
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-cache",
        },
      });
    }

    const csv = buildProjectsCsv(projects);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="projets-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("[api/admin/projects/export] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
