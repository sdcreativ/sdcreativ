import type { Contract } from "@/lib/contracts";
import { formatInvoiceAmount } from "@/content/invoices-labels";
import { applyLetterhead, LETTERHEAD, type LetterheadInfo } from "@/lib/billing/letterhead";
import {
  buildMaintenanceClauses,
  formatDateLong,
  MAINTENANCE_INTERVAL_LABELS,
  maintenanceLevel,
  maintenancePricing,
  maintenanceSchedule,
  readMaintenanceTerms,
  type MaintenanceTerms,
} from "@/lib/maintenance-contract";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type ContractSignature = {
  signerName: string;
  signedAt: string;
  signatureHash: string;
  signatureDataUrl: string;
  documentSha256?: string;
};

export function buildContractPdfHtml(
  contract: Contract,
  siteUrl: string,
  signature?: ContractSignature,
  letterhead: LetterheadInfo = LETTERHEAD,
): string {
  const maintenance = readMaintenanceTerms(contract.metadata);
  if (maintenance) return buildMaintenanceContractHtml(contract, maintenance, signature, letterhead);
  const amount =
    contract.amount != null ? formatInvoiceAmount(contract.amount) : "—";
  const sigBlock = signature
    ? `
  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #ddd">
    <p style="margin:0 0 0.5rem"><strong>Signé par :</strong> ${escapeHtml(signature.signerName)}</p>
    <p style="margin:0 0 0.5rem"><strong>Date :</strong> ${escapeHtml(new Date(signature.signedAt).toLocaleString("fr-FR"))}</p>
    <p style="margin:0 0 0.5rem;font-family:monospace;font-size:11px;color:#666;word-break:break-all">Empreinte preuve : ${escapeHtml(signature.signatureHash.slice(0, 40))}…</p>
    ${
      signature.documentSha256
        ? `<p style="margin:0 0 1rem;font-family:monospace;font-size:11px;color:#666;word-break:break-all">SHA-256 document : ${escapeHtml(signature.documentSha256.slice(0, 40))}…</p>`
        : ""
    }
    <img src="${signature.signatureDataUrl}" alt="Signature" style="max-height:80px;max-width:280px;border-bottom:1px solid #9ca3af" />
    <p style="margin-top:12px;font-size:11px;color:#888">Signature SD CREATIV (preuve métier renforcée) — pas une signature eIDAS qualifiée.</p>
  </div>`
    : "";

  return applyLetterhead(`<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"/><title>${escapeHtml(contract.reference)}</title>
<style>
  body{font-family:Georgia,serif;color:#111;margin:40px;line-height:1.5}
  h1{font-size:22px;margin:0 0 8px}
  .meta{color:#555;font-size:13px;margin-bottom:24px}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  td{padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:14px}
  td:first-child{color:#666;width:40%}
  .footer{margin-top:48px;font-size:11px;color:#888}
</style></head>
<body>
  <h1>${escapeHtml(contract.title)}</h1>
  <p class="meta">${escapeHtml(contract.reference)} · ${escapeHtml(siteUrl.replace(/^https?:\/\//, ""))}</p>
  <table>
    <tr><td>Client</td><td>${escapeHtml(contract.clientName ?? "—")}</td></tr>
    <tr><td>Projet</td><td>${escapeHtml(contract.projectName ?? "—")}</td></tr>
    <tr><td>Montant</td><td>${escapeHtml(amount)}</td></tr>
    <tr><td>Début</td><td>${escapeHtml(contract.startDate ?? "—")}</td></tr>
    <tr><td>Fin</td><td>${escapeHtml(contract.endDate ?? "—")}</td></tr>
  </table>
  ${contract.notes ? `<p style="margin-top:24px">${escapeHtml(contract.notes)}</p>` : ""}
  ${sigBlock}
  <p class="footer">Document généré pour signature électronique — SD CREATIV</p>
</body></html>`, letterhead);
}

/** Contrat de maintenance complet : parties, conditions, clauses numérotées, signatures. */
function buildMaintenanceContractHtml(
  contract: Contract,
  terms: MaintenanceTerms,
  signature?: ContractSignature,
  letterhead: LetterheadInfo = LETTERHEAD,
): string {
  const startDate = contract.startDate ?? contract.createdAt.slice(0, 10);
  const clientName = contract.clientName ?? "Le Client";
  const plan = maintenanceLevel(terms.level);
  const { paidFrom } = maintenanceSchedule(terms, startDate);
  const price = maintenancePricing(terms);
  const interval = MAINTENANCE_INTERVAL_LABELS[terms.billingInterval];
  const clauses = buildMaintenanceClauses(terms, { startDate, clientName });

  const clausesHtml = clauses
    .map(
      (clause, i) => `
  <section class="clause">
    <h2>Article ${i + 1} — ${escapeHtml(clause.title)}</h2>
    ${clause.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
    ${clause.bullets?.length ? `<ul>${clause.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>` : ""}
  </section>`,
    )
    .join("");

  const priceLabel = `${formatInvoiceAmount(price.ht)} HT / ${interval.per} (${formatInvoiceAmount(price.ttc)} TTC)`;
  const signedProof = signature
    ? `
      <p class="sig-meta">${escapeHtml(signature.signerName)} — ${escapeHtml(new Date(signature.signedAt).toLocaleString("fr-FR", { timeZone: "Africa/Abidjan" }))}</p>
      <img src="${signature.signatureDataUrl}" alt="Signature du Client" class="sig-img" />
      <p class="proof">Empreinte preuve : ${escapeHtml(signature.signatureHash.slice(0, 40))}…${
        signature.documentSha256 ? `<br/>SHA-256 document : ${escapeHtml(signature.documentSha256.slice(0, 40))}…` : ""
      }</p>`
    : `<p class="sig-hint">Lu et approuvé — signature</p>`;

  return applyLetterhead(`<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"/><title>${escapeHtml(contract.reference)} — Contrat de maintenance</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Aptos','Open Sans','Noto Sans','Segoe UI',Arial,sans-serif; color: #0C2142; margin: 32px; line-height: 1.5; font-size: 10.5pt; }
  .eyebrow { margin: 0 0 4px; font-size: 8pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #145BAC; }
  h1 { margin: 0; font-size: 17pt; }
  .meta { margin: 4px 0 16px; font-size: 9pt; color: #526275; }
  .card { border: 1px solid #D7DFE8; border-radius: 6px; padding: 10px 14px; margin: 0 0 14px; break-inside: avoid; }
  .card table { width: 100%; border-collapse: collapse; }
  .card td { padding: 3px 0; vertical-align: top; font-size: 9.5pt; }
  .card td:first-child { width: 34%; color: #526275; }
  .clause { margin: 0 0 10px; }
  .clause h2 { margin: 14px 0 4px; font-size: 10.5pt; color: #145BAC; break-after: avoid; }
  .clause p { margin: 0 0 5px; text-align: justify; }
  .clause ul { margin: 2px 0 6px; padding-left: 18px; }
  .signatures { display: flex; gap: 24px; margin-top: 22px; break-inside: avoid; }
  .signatures > div { flex: 1; border-top: 1px solid #526275; padding-top: 8px; }
  .sig-title { margin: 0; font-weight: 700; font-size: 9.5pt; }
  .sig-meta { margin: 4px 0 0; font-size: 9pt; color: #526275; }
  .sig-hint { margin: 34px 0 0; font-size: 8.5pt; color: #94a3b8; }
  .sig-img { display: block; max-height: 70px; max-width: 230px; margin-top: 6px; }
  .proof { margin: 6px 0 0; font-family: monospace; font-size: 7pt; color: #526275; word-break: break-all; }
  .note { margin-top: 14px; font-size: 8pt; color: #526275; }
</style></head>
<body>
  <p class="eyebrow">Contrat de maintenance</p>
  <h1>${escapeHtml(contract.title)}</h1>
  <p class="meta">Réf. ${escapeHtml(contract.reference)} · Établi le ${escapeHtml(formatDateLong(contract.createdAt.slice(0, 10)))}</p>

  <div class="card">
    <table>
      <tr><td>Prestataire</td><td><strong>${escapeHtml(letterhead.legalName)}</strong> — ${escapeHtml(letterhead.legalForm)}<br/>${escapeHtml(letterhead.headOffice)}<br/>RCCM ${escapeHtml(letterhead.rccm)} · IDU ${escapeHtml(letterhead.idu)}${letterhead.ncc ? ` · NCC ${escapeHtml(letterhead.ncc)}` : ""}</td></tr>
      <tr><td>Client</td><td><strong>${escapeHtml(clientName)}</strong></td></tr>
      <tr><td>Site maintenu</td><td>${escapeHtml(terms.siteName)}${terms.siteUrl ? ` — ${escapeHtml(terms.siteUrl)}` : ""}</td></tr>
      <tr><td>Niveau de service</td><td>${escapeHtml(plan.name)} — prise en charge sous ${escapeHtml(plan.responseTime)}</td></tr>
      <tr><td>Prise d'effet</td><td>${escapeHtml(formatDateLong(startDate))}${terms.includedMonths > 0 ? ` · ${terms.includedMonths} mois inclus jusqu'au ${escapeHtml(formatDateLong(paidFrom))}` : ""}</td></tr>
      <tr><td>Facturation</td><td>${escapeHtml(interval.adjective[0]!.toUpperCase() + interval.adjective.slice(1))} à partir du ${escapeHtml(formatDateLong(paidFrom))} : ${escapeHtml(priceLabel)}</td></tr>
      ${terms.benefit ? `<tr><td>Avantage</td><td>-${terms.benefit.percent} % du ${escapeHtml(formatDateLong(terms.benefit.startsOn))} au ${escapeHtml(formatDateLong(terms.benefit.endsOn))} (code ${escapeHtml(terms.benefit.promoCode)})</td></tr>` : ""}
    </table>
  </div>

  ${clausesHtml}
  ${contract.notes ? `<section class="clause"><h2>Conditions particulières</h2><p>${escapeHtml(contract.notes)}</p></section>` : ""}

  <div class="signatures">
    <div>
      <p class="sig-title">Pour SD CREATIV</p>
      <p class="sig-meta">La Direction</p>
    </div>
    <div>
      <p class="sig-title">Pour le Client</p>
      ${signedProof}
    </div>
  </div>
  <p class="note">Contrat établi en exemplaire électronique et signé par signature électronique simple (preuve horodatée, code à usage unique).</p>
</body></html>`, letterhead);
}
