import { crmApiAuth } from "@/lib/crm-api-auth";
import { getAdminSession } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { submitCrmDocFeedback } from "@/lib/crm-docs-feedback";

const schema = z.object({
  slug: z.string().trim().min(1).max(80),
  kind: z.enum(["helpful", "error"]),
  message: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request) {
  const authError = await crmApiAuth.docs.read();
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    if (parsed.data.kind === "error" && !parsed.data.message?.trim()) {
      return NextResponse.json(
        { error: "Décrivez l’erreur signalée." },
        { status: 400 },
      );
    }

    const session = await getAdminSession();
    const feedback = await submitCrmDocFeedback({
      pageSlug: parsed.data.slug,
      kind: parsed.data.kind,
      message: parsed.data.message,
      userId: session?.userId,
      userName: session?.name,
      userEmail: session?.email,
    });
    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/crm-docs/feedback]", error);
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
