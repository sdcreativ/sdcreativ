import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import {
  createPublicRealisation,
  createPublicRealisationSchema,
  listPublicRealisations,
} from "@/lib/public-realisations";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidateRealisationsPages } from "@/lib/site-revalidate";

export async function GET(request: Request) {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const locale = new URL(request.url).searchParams.get("locale") ?? undefined;
  const realisations = await listPublicRealisations({ locale });
  return NextResponse.json({ realisations });
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const parsed = createPublicRealisationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  const realisation = await createPublicRealisation(parsed.data);
  revalidateRealisationsPages(realisation.slug);
  return NextResponse.json({ realisation }, { status: 201 });
}
