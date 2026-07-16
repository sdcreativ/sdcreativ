import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/admin-auth";
import { auditCrmAction } from "@/lib/crm-audit-actions";
import { isDatabaseConfigured } from "@/lib/db";
import { softDeleteMailThreads } from "@/lib/mail/repository";

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

/** Soft-delete sélectif de conversations. Permission mail.write. */
export async function POST(request: Request) {
  const authError = await requireAdminAuth({ permission: "mail.write" });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }

    const result = await softDeleteMailThreads(parsed.data.ids);

    await auditCrmAction({
      action: "delete",
      entityType: "mail_thread",
      entityId: parsed.data.ids[0],
      summary: `${result.deleted} conversation(s) messagerie supprimée(s)`,
      metadata: { ids: parsed.data.ids, deleted: result.deleted },
    });

    return NextResponse.json({ ok: true, deleted: result.deleted });
  } catch (error) {
    console.error("[api/admin/mail/threads/bulk-delete] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
