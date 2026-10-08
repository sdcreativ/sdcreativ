import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { getDocumentLetterhead } from "@/lib/billing/document-company";
import { applyLetterhead } from "@/lib/billing/letterhead";
import { htmlToPdfResponse } from "@/lib/server-pdf";

/** Page d'exemple sur le papier à en-tête, avec les mentions enregistrées dans les Paramètres du site. */
export async function GET() {
  const authError = await crmApiAuth.settingsAccess();
  if (authError) return authError;
  try {
    const letterhead = await getDocumentLetterhead();
    const html = applyLetterhead(
      `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><title>Aperçu du papier à en-tête</title>
<style>body{font-family:'Aptos','Open Sans',Arial,sans-serif;color:#0C2142;margin:32px;font-size:10.5pt;line-height:1.5}</style></head>
<body><h1 style="font-size:16pt">Aperçu du papier à en-tête</h1>
<p>Ce document d'exemple reprend l'en-tête et le pied de page imprimés sur les devis, factures et contrats.</p>
<p>NCC : ${letterhead.ncc ? letterhead.ncc.replace(/</g, "&lt;") : "<em>non renseigné</em>"}</p></body></html>`,
      letterhead,
    );
    return htmlToPdfResponse(html, "apercu-papier-en-tete");
  } catch (error) {
    console.error("[api/admin/letterhead-preview] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
