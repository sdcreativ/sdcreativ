import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { deleteKadyKnowledge, kadyKnowledgeSchema, updateKadyKnowledge } from "@/lib/kady-knowledge";
import { revalidateKadyKnowledge } from "@/lib/site-revalidate";

type Props = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

export async function PATCH(request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  try {
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: "Réponse introuvable." }, { status: 404 });
    const parsed = kadyKnowledgeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }
    const entry = await updateKadyKnowledge(id, parsed.data);
    if (!entry) return NextResponse.json({ error: "Réponse introuvable." }, { status: 404 });
    revalidateKadyKnowledge();
    return NextResponse.json({ entry });
  } catch (error) {
    console.error("[api/admin/kady-knowledge/id] PATCH", error);
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  try {
    const { id } = await params;
    if (!UUID.test(id) || !(await deleteKadyKnowledge(id))) {
      return NextResponse.json({ error: "Réponse introuvable." }, { status: 404 });
    }
    revalidateKadyKnowledge();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/kady-knowledge/id] DELETE", error);
    return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  }
}
