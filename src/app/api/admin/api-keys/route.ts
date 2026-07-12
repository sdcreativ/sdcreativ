import { crmApiAuth } from "@/lib/crm-api-auth";
import { getAdminSession } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { createApiKey, createApiKeySchema, listApiKeys, revokeApiKey } from "@/lib/api-keys";

export async function GET() {
  const authError = await crmApiAuth.settings.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }
  return NextResponse.json({ apiKeys: await listApiKeys() });
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.settings.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }
  const body = await request.json();
  const parsed = createApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  }
  const session = await getAdminSession();
  const created = await createApiKey(parsed.data, session?.userId);
  return NextResponse.json({ apiKey: created }, { status: 201 });
}

export async function DELETE(request: Request) {
  const authError = await crmApiAuth.settings.write();
  if (authError) return authError;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requis." }, { status: 400 });
  await revokeApiKey(id);
  return NextResponse.json({ ok: true });
}
