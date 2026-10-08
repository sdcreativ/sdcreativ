import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Papier à en-tête officiel SD CREATIV (modèle « SDCREATIV_Papier_a_en_tete_A4.docx »).
 * Valeurs relevées dans le modèle Word : A4, marges 52 / 27 / 22 / 22 mm, logo 28 × 28 mm,
 * police Aptos (repli Open Sans sur le serveur), filet bleu #145BAC 1,6 pt, pied #D7DFE8.
 * Utilisé pour tous les documents administratifs : devis, factures, contrats clients et de travail.
 */
export const LETTERHEAD = {
  tagline: "SOLUTIONS DIGITALES • WEB • CLOUD • IA",
  website: "www.sdcreativ.com",
  email: "contact@sdcreativ.com",
  phones: ["+225 0565911347", "+225 0768704858"],
  legalName: "SDCREATIV",
  legalForm: "• SARL au capital de 1 000 000 F CFA",
  headOffice: "Abidjan Cocody Angré, 22ème arrondissement SICOGI, LGT 344, Côte d’Ivoire",
  rccm: "CI-ABJ-03-2026-B12-06135",
  idu: "CI-2026-0074317 R",
} as const;

const ADDRESS_LINE = `Siège social : ${LETTERHEAD.headOffice}\u2002•\u2002${LETTERHEAD.website}`;
const REGISTRATION = `RCCM : ${LETTERHEAD.rccm}\u2003•\u2003IDU : ${LETTERHEAD.idu}`;

const COLORS = { blue: "#145BAC", navy: "#0C2142", grey: "#526275", rule: "#D7DFE8" } as const;
// Guillemets simples : la valeur est insérée dans des attributs style="…".
const FONT = `'Aptos','Open Sans','Noto Sans','Segoe UI',Arial,sans-serif`;

/**
 * Zones réservées sur chaque page du PDF. Le haut couvre l'en-tête jusqu'au filet bleu (57 mm dans
 * le modèle) ; le texte démarre juste dessous. Côtés et bas : marges du modèle.
 */
export const LETTERHEAD_PAGE_MARGINS = { top: "60mm", bottom: "28mm", left: "22mm", right: "22mm" } as const;

let cachedLogo: string | null = null;

/** Logo du modèle (PNG d'origine 428 px) en data-URI : indispensable aux en-têtes répétés du PDF. */
export function getLetterheadLogoDataUrl(): string {
  if (cachedLogo) return cachedLogo;
  try {
    const file = path.join(/* turbopackIgnore: true */ process.cwd(), "public", "images", "letterhead-logo.png");
    cachedLogo = `data:image/png;base64,${readFileSync(file).toString("base64")}`;
  } catch {
    cachedLogo = "";
  }
  return cachedLogo;
}

function headerInner(logoSrc: string): string {
  const contact = (text: string) =>
    `<div style="font-size:8pt;line-height:1.42;color:${COLORS.grey}">${text}</div>`;
  return `
  <div style="display:flex;align-items:center;justify-content:space-between">
    <div>
      ${logoSrc ? `<img src="${logoSrc}" alt="SD CREATIV" style="display:block;width:28mm;height:28mm" />` : ""}
      <div style="margin-top:3mm;font-size:7pt;font-weight:700;letter-spacing:0.02em;color:${COLORS.grey};white-space:nowrap">${LETTERHEAD.tagline}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:9pt;line-height:1.42;font-weight:700;color:${COLORS.blue}">${LETTERHEAD.website}</div>
      ${contact(LETTERHEAD.email)}
      ${LETTERHEAD.phones.map(contact).join("")}
    </div>
  </div>
  <div style="margin-top:9.8mm;border-bottom:1.6pt solid ${COLORS.blue}"></div>`;
}

function footerInner(): string {
  return `
  <div style="border-top:0.6pt solid ${COLORS.rule};padding-top:2.5mm;text-align:center">
    <div style="font-size:8pt;font-weight:700;line-height:1.4;color:${COLORS.navy}">${LETTERHEAD.legalName} ${LETTERHEAD.legalForm}</div>
    <div style="margin-top:0.6mm;font-size:7.5pt;line-height:1.25;color:${COLORS.grey}">${ADDRESS_LINE}</div>
    <div style="font-size:7pt;line-height:1.25;color:${COLORS.grey}">${REGISTRATION}</div>
  </div>`;
}

/** Gabarits Chromium (en-tête / pied répétés sur chaque page). Unités physiques : rendu à l'échelle réelle. */
export function letterheadPdfTemplates(logoSrc: string): { headerTemplate: string; footerTemplate: string } {
  const base = `font-family:${FONT};-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;width:100%`;
  return {
    // Décalages calibrés par superposition avec le PDF du modèle (logo à 12,7 mm, filet à 55,8 mm).
    headerTemplate: `<div style="${base};padding:7.2mm 22mm 0">${headerInner(logoSrc)}</div>`,
    // Chromium aligne le pied en bas de la marge : on le remonte (filet à 270 mm comme le modèle).
    footerTemplate: `<div style="${base};padding:0 22mm 7.6mm">${footerInner()}</div>`,
  };
}

const MARKER = "sd-letterhead";

/** Le document HTML porte-t-il le papier à en-tête ? (détecté par le moteur PDF) */
export function hasLetterhead(html: string): boolean {
  return html.includes(`id="${MARKER}-header"`);
}

/**
 * Habille un document HTML avec le papier à en-tête :
 * - PDF (Chromium) : en-tête et pied répétés sur chaque page, depuis les <template> ;
 * - aperçu / impression navigateur : en-tête en haut et pied en bas du document (blocs .sd-lh-inline),
 *   masqués par le moteur PDF pour éviter les doublons.
 */
export function applyLetterhead(html: string, logoSrc = getLetterheadLogoDataUrl()): string {
  const { headerTemplate, footerTemplate } = letterheadPdfTemplates(logoSrc);
  const style = `
  <style id="${MARKER}-style">
    .sd-lh-inline { font-family: ${FONT}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sd-lh-inline.sd-lh-top { margin: 0 0 8mm; }
    .sd-lh-inline.sd-lh-bottom { margin: 12mm 0 0; }
  </style>`;
  const inlineHeader = `<div class="sd-lh-inline sd-lh-top">${headerInner(logoSrc)}</div>`;
  const inlineFooter = `<div class="sd-lh-inline sd-lh-bottom">${footerInner()}</div>`;
  const templates =
    `<template id="${MARKER}-header">${headerTemplate}</template>` +
    `<template id="${MARKER}-footer">${footerTemplate}</template>`;

  return html
    .replace("</head>", `${style}</head>`)
    .replace(/<body([^>]*)>/, `<body$1>${inlineHeader}`)
    .replace("</body>", `${inlineFooter}${templates}</body>`);
}

/**
 * CSS ajouté par le moteur PDF : marges du modèle (prioritaires sur les @page des documents)
 * et suppression des blocs d'aperçu remplacés par les en-têtes / pieds répétés.
 */
export const LETTERHEAD_PDF_CSS = `
  @page { size: A4; margin: ${LETTERHEAD_PAGE_MARGINS.top} ${LETTERHEAD_PAGE_MARGINS.right} ${LETTERHEAD_PAGE_MARGINS.bottom} ${LETTERHEAD_PAGE_MARGINS.left} !important; }
  .sd-lh-inline { display: none !important; }
  html, body { background: #ffffff !important; }
  body { margin: 0 !important; padding: 0 !important; max-width: none !important; }
  .sheet { width: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
`;

export const LETTERHEAD_MARKER = MARKER;
