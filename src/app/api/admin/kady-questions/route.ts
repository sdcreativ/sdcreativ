import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { listQuestionsToImprove } from "@/lib/chat-conversations";

/** Questions mal traitées par Nari (réponse par défaut ou 👎), à transformer en réponses. */
export async function GET() {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  try {
    return NextResponse.json({ questions: await listQuestionsToImprove() });
  } catch (error) {
    console.error("[api/admin/kady-questions] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
