import { NextResponse } from "next/server";
import { getKadyAppearance } from "@/lib/kady-settings";

/** Nom de l'assistante réglé dans CRM → Site → Assistante (donnée publique : il s'affiche sur le site). */
export async function GET() {
  const { name } = await getKadyAppearance();
  return NextResponse.json({ name }, { headers: { "Cache-Control": "public, max-age=60" } });
}
