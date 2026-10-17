import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createKadyKnowledge,
  KADY_KNOWLEDGE_LOCALES,
  kadyKnowledgeSchema,
  listKadyKnowledge,
  type KadyKnowledgeLocale,
} from "@/lib/kady-knowledge";
import { revalidateKadyKnowledge } from "@/lib/site-revalidate";

function localeFrom(request: Request): KadyKnowledgeLocale {
  const value = new URL(request.url).searchParams.get("locale");
  return (KADY_KNOWLEDGE_LOCALES as readonly string[]).includes(value ?? "") ? (value as KadyKnowledgeLocale) : "fr";
}

export async function GET(request: Request) {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  try {
    return NextResponse.json(await listKadyKnowledge(localeFrom(request)));
  } catch (error) {
    console.error("[api/admin/kady-knowledge] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  try {
    const parsed = kadyKnowledgeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }
    const entry = await createKadyKnowledge(parsed.data);
    revalidateKadyKnowledge();
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/kady-knowledge] POST", error);
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 });
  }
}
