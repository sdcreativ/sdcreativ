import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  countUnreadMailThreads,
  listMailThreads,
} from "@/lib/mail/repository";
import type { CrmMailThreadStatus } from "@/lib/mail/types";

const STATUSES = new Set<CrmMailThreadStatus>(["open", "archived"]);

export async function GET(request: Request) {
  const authError = await requireAdminAuth({ permission: "mail.read" });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const mailboxId = searchParams.get("mailboxId")?.trim() || undefined;
    const statusRaw = searchParams.get("status")?.trim();
    const status =
      statusRaw && STATUSES.has(statusRaw as CrmMailThreadStatus)
        ? (statusRaw as CrmMailThreadStatus)
        : undefined;
    const unreadOnly = searchParams.get("unreadOnly") === "1";
    const search = searchParams.get("search")?.trim() || undefined;
    const clientId = searchParams.get("clientId")?.trim() || undefined;
    const leadId = searchParams.get("leadId")?.trim() || undefined;
    const limitRaw = Number(searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(limitRaw) ? limitRaw : 50;

    const [threads, unreadCount] = await Promise.all([
      listMailThreads({
        mailboxId,
        status,
        unreadOnly,
        search,
        clientId,
        leadId,
        limit,
      }),
      countUnreadMailThreads(mailboxId),
    ]);

    return NextResponse.json({ threads, unreadCount });
  } catch (error) {
    console.error("[api/admin/mail/threads] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
