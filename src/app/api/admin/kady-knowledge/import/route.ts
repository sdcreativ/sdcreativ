import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { importKadyKnowledgeFromCode, KADY_KNOWLEDGE_LOCALES, type KadyKnowledgeLocale } from "@/lib/kady-knowledge";
import { revalidateKadyKnowledge } from "@/lib/site-revalidate";

/** Copie les réponses actuelles (écrites dans le code) dans l'admin pour pouvoir les modifier. */
export async function POST(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  try {
    const body = (await request.json().catch(() => ({}))) as { locale?: string };
    const locale: KadyKnowledgeLocale = (KADY_KNOWLEDGE_LOCALES as readonly string[]).includes(body.locale ?? "")
      ? (body.locale as KadyKnowledgeLocale)
      : "fr";
    const imported = await importKadyKnowledgeFromCode(locale);
    revalidateKadyKnowledge();
    return NextResponse.json({ imported });
  } catch (error) {
    console.error("[api/admin/kady-knowledge/import] POST", error);
    return NextResponse.json({ error: "Import impossible." }, { status: 500 });
  }
}
