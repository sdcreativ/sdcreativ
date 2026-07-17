import type { Contract } from "@/lib/contracts";
import { formatInvoiceAmount } from "@/content/invoices-labels";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildContractPdfHtml(
  contract: Contract,
  siteUrl: string,
  signature?: {
    signerName: string;
    signedAt: string;
    signatureHash: string;
    signatureDataUrl: string;
    documentSha256?: string;
  },
): string {
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

  return `<!DOCTYPE html>
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
</body></html>`;
}
