import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { listConversations, type ConversationFilter } from "@/lib/chat-conversations";

const FILTERS: ConversationFilter[] = ["all", "unread", "lead", "intent", "next_step"];

export async function GET(request: Request) {
  const authError = await crmApiAuth.leads.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }
  try {
    const params = new URL(request.url).searchParams;
    const requested = params.get("filter") as ConversationFilter | null;
    const filter = requested && FILTERS.includes(requested) ? requested : "all";
    const ref = params.get("ref")?.slice(0, 20) || undefined;
    return NextResponse.json({ conversations: await listConversations({ filter, ref }) });
  } catch (error) {
    console.error("[api/admin/chat-conversations] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
