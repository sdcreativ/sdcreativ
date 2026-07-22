import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { z } from "zod";
import { CRM_DOC_ONBOARDING_WEEK } from "@/content/crm-docs/onboarding-week";
import {
  listCrmDocOnboardingProgress,
  setCrmDocOnboardingStep,
} from "@/lib/crm-docs-onboarding";

export async function GET() {
  const authError = await crmApiAuth.docs.read();
  if (authError) return authError;

  const session = await getAdminSession();
  if (!session?.userId || session.userId === "legacy") {
    return NextResponse.json({ steps: CRM_DOC_ONBOARDING_WEEK, completed: [] });
  }

  try {
    const completed = await listCrmDocOnboardingProgress(session.userId);
    return NextResponse.json({ steps: CRM_DOC_ONBOARDING_WEEK, completed });
  } catch (error) {
    console.error("[api/admin/crm-docs/onboarding] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

const patchSchema = z.object({
  stepId: z.string().trim().min(1).max(80),
  completed: z.boolean(),
});

export async function PATCH(request: Request) {
  const authError = await crmApiAuth.docs.read();
  if (authError) return authError;

  const session = await getAdminSession();
  if (!session?.userId || session.userId === "legacy") {
    return NextResponse.json({ error: "Session invalide." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }
    const completed = await setCrmDocOnboardingStep(
      session.userId,
      parsed.data.stepId,
      parsed.data.completed,
    );
    return NextResponse.json({ completed });
  } catch (error) {
    console.error("[api/admin/crm-docs/onboarding] PATCH", error);
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
