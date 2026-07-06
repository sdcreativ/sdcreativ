import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { listCalendarItems } from "@/lib/calendar";
import { endOfMonth, startOfMonth } from "@/content/calendar-labels";

export async function GET(request: Request) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    let from: Date;
    let to: Date;

    if (fromParam && toParam) {
      from = new Date(fromParam);
      to = new Date(toParam);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return NextResponse.json({ error: "Paramètres from/to invalides." }, { status: 400 });
      }
    } else if (year && month !== undefined && month >= 0 && month <= 11) {
      from = startOfMonth(year, month);
      from.setDate(from.getDate() - 7);
      to = endOfMonth(year, month);
      to.setDate(to.getDate() + 7);
    } else {
      return NextResponse.json({ error: "Paramètres year/month ou from/to requis." }, { status: 400 });
    }

    const items = await listCalendarItems(from, to);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[api/admin/calendar] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
