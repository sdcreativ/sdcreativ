import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getConversation, getConversationMessages, markConversationRead } from "@/lib/chat-conversations";

type Props = { params: Promise<{ id: string }> };

/** Conversation complète ; l'ouvrir la marque comme lue. */
export async function GET(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.leads.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
    const conversation = await getConversation(id);
    if (!conversation) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
    const messages = await getConversationMessages(id);
    if (!conversation.readAt) await markConversationRead(id);
    return NextResponse.json({ conversation, messages });
  } catch (error) {
    console.error("[api/admin/chat-conversations/id] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
