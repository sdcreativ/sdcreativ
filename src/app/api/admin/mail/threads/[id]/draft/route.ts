import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  deleteMailDraft,
  getMailDraft,
  getMailThreadById,
  upsertMailDraft,
} from "@/lib/mail/repository";

type RouteContext = { params: Promise<{ id: string }> };

const upsertDraftSchema = z.object({
  bodyText: z.string().max(100_000),
  bodyHtml: z.string().max(500_000).nullable().optional(),
  includeSignature: z.boolean().optional(),
});

/** Charge le brouillon de l’utilisateur courant pour ce thread. */
export async function GET(_request: Request, context: RouteContext) {
  const authError = await requireAdminAuth({
    anyPermission: ["mail.write", "mail.read"],
  });
  if (authError) return authError;

  const session = await getAdminSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Session invalide." }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const thread = await getMailThreadById(id);
    if (!thread) {
      return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
    }

    const draft = await getMailDraft(id, session.userId);
    return NextResponse.json({ draft });
  } catch (error) {
    console.error("[api/admin/mail/threads/[id]/draft] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

/** Crée / met à jour le brouillon (upsert). Permission mail.write. */
export async function PUT(request: Request, context: RouteContext) {
  const authError = await requireAdminAuth({ permission: "mail.write" });
  if (authError) return authError;

  const session = await getAdminSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Session invalide." }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const thread = await getMailThreadById(id);
    if (!thread) {
      return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = upsertDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }

    if (!parsed.data.bodyText.trim()) {
      await deleteMailDraft(id, session.userId);
      return NextResponse.json({ draft: null });
    }

    const draft = await upsertMailDraft({
      threadId: id,
      userId: session.userId,
      bodyText: parsed.data.bodyText,
      bodyHtml: parsed.data.bodyHtml,
      includeSignature: parsed.data.includeSignature,
    });

    return NextResponse.json({ draft });
  } catch (error) {
    console.error("[api/admin/mail/threads/[id]/draft] PUT", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

/** Supprime le brouillon. */
export async function DELETE(_request: Request, context: RouteContext) {
  const authError = await requireAdminAuth({ permission: "mail.write" });
  if (authError) return authError;

  const session = await getAdminSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Session invalide." }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    await deleteMailDraft(id, session.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/mail/threads/[id]/draft] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
