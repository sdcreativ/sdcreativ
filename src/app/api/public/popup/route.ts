import { NextResponse } from "next/server";
import { getActivePopupForPath } from "@/lib/site-popups";

/** Popup actif pour une page publique (aucune donnée personnelle, aucune statistique). */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const path = (params.get("path") ?? "/").slice(0, 300);
  const locale = params.get("locale") === "en" ? "en" : "fr";
  try {
    const popup = await getActivePopupForPath(path.startsWith("/") ? path : `/${path}`, locale);
    return NextResponse.json({ popup }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (error) {
    console.error("[api/public/popup] GET", error);
    return NextResponse.json({ popup: null });
  }
}
