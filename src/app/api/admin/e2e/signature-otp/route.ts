import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { isCrmE2eEnabled, takeCrmE2eSignatureOtp } from "@/lib/crm-e2e";
import type { SignatureEntityType } from "@/lib/signature/types";

const ENTITY_TYPES: SignatureEntityType[] = ["quote", "contract", "employee_contract"];

/**
 * Récupère le dernier OTP de signature généré (mémoire process).
 * Actif uniquement si CRM_E2E_LOGIN_TOKEN est défini — jamais en prod sans ce secret.
 */
export async function GET(request: Request) {
  if (!isCrmE2eEnabled()) {
    return NextResponse.json({ error: "E2E CRM désactivé." }, { status: 404 });
  }

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType") as SignatureEntityType | null;
  const entityId = searchParams.get("entityId")?.trim();

  if (!entityType || !ENTITY_TYPES.includes(entityType) || !entityId) {
    return NextResponse.json({ error: "entityType et entityId requis." }, { status: 400 });
  }

  const code = takeCrmE2eSignatureOtp(entityType, entityId);
  if (!code) {
    return NextResponse.json({ error: "Aucun OTP e2e en mémoire." }, { status: 404 });
  }

  return NextResponse.json({ code });
}
