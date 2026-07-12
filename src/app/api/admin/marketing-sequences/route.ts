import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { listMarketingSequences, updateMarketingSequence, updateSequenceSchema } from "@/lib/marketing-sequences";

export async function GET() {
  const authError = await crmApiAuth.leads.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }
  const sequences = await listMarketingSequences();
  return NextResponse.json({ sequences });
}

export async function PATCH(request: Request) {
  const authError = await crmApiAuth.leads.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }
  const body = await request.json();
  const id = String(body.id ?? "");
  const parsed = updateSequenceSchema.safeParse(body);
  if (!id || !parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }
  await updateMarketingSequence(id, parsed.data);
  const sequences = await listMarketingSequences();
  return NextResponse.json({ sequences });
}
