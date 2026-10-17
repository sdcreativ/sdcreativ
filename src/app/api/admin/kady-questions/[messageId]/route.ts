import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { markQuestionReviewed } from "@/lib/chat-conversations";

type Props = { params: Promise<{ messageId: string }> };

/** Question traitée (réponse ajoutée ou ignorée) : elle sort de la liste. */
export async function DELETE(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const { messageId } = await params;
  if (!/^\d{1,18}$/.test(messageId)) return NextResponse.json({ error: "Question introuvable." }, { status: 404 });
  try {
    await markQuestionReviewed(messageId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/kady-questions/id] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
