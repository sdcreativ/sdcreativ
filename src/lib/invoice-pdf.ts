import type { Invoice } from "@/lib/invoices";
import {
  formatInvoiceAmount,
  formatInvoiceDate,
  INVOICE_STATUS_LABELS,
} from "@/content/invoices-labels";
import type { InvoiceDocumentCompany } from "@/lib/billing/document-company";
import type { PdfVerification } from "@/lib/billing/verification-html";
import { injectVerificationBlock } from "@/lib/billing/verification-html";

export type InvoicePdfOptions = {
  forArchive?: boolean;
  verification?: PdfVerification;
  paymentInstructionsHtml?: string;
  company?: InvoiceDocumentCompany;
};

function statusColor(status: Invoice["status"]): string {
  if (status === "paid") return "#059669";
  if (status === "overdue") return "#dc2626";
  if (status === "sent") return "#0284c7";
  return "#64748b";
}

function buildCompanyHeader(company: InvoiceDocumentCompany): string {
  const legalParts: string[] = [];
  if (company.rccm.trim()) legalParts.push(`RCCM : ${escapeHtml(company.rccm.trim())}`);
  if (company.ncc.trim()) legalParts.push(`NCC : ${escapeHtml(company.ncc.trim())}`);

  return `
  <header style="margin-bottom:32px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:28px 32px;border-radius:16px;background:linear-gradient(135deg, ${company.primaryColor} 0%, #071525 100%);color:#ffffff">
      <div style="display:flex;align-items:center;gap:20px;min-width:0">
        <div style="flex-shrink:0;display:flex;align-items:center;justify-content:center;width:88px;height:88px;border-radius:14px;background:rgba(255,255,255,0.98);padding:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12)">
          <img src="${company.logoUrl.startsWith("data:") ? company.logoUrl : escapeHtml(company.logoUrl)}" alt="${escapeHtml(company.agencyName)}" style="max-width:100%;max-height:100%;object-fit:contain" />
        </div>
        <div style="min-width:0">
          <p style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.02em;line-height:1.2">${escapeHtml(company.agencyName)}</p>
          ${company.tagline ? `<p style="margin:6px 0 0;font-size:13px;opacity:0.88;line-height:1.4">${escapeHtml(company.tagline)}</p>` : ""}
        </div>
      </div>
      <div style="text-align:right;font-size:12px;line-height:1.7;opacity:0.92;flex-shrink:0">
        ${company.address ? `<p style="margin:0">${escapeHtml(company.address)}</p>` : ""}
        ${company.phone ? `<p style="margin:0">${escapeHtml(company.phone)}</p>` : ""}
        ${company.email ? `<p style="margin:0"><a href="mailto:${escapeHtml(company.email)}" style="color:#ffffff;text-decoration:none">${escapeHtml(company.email)}</a></p>` : ""}
        ${company.hours ? `<p style="margin:4px 0 0;opacity:0.8">${escapeHtml(company.hours)}</p>` : ""}
        ${company.siteUrl ? `<p style="margin:4px 0 0;opacity:0.8">${escapeHtml(company.siteUrl.replace(/^https?:\/\//, ""))}</p>` : ""}
      </div>
    </div>
    ${legalParts.length > 0 ? `<p style="margin:10px 4px 0;font-size:10px;color:#94a3b8;text-align:right">${legalParts.join(" · ")}</p>` : ""}
  </header>`;
}

function buildDefaultCompany(siteUrl: string): InvoiceDocumentCompany {
  return {
    agencyName: "SD CREATIV",
    tagline: "Agence Web & Solutions Digitales",
    primaryColor: "#1e40af",
    accentColor: "#e85d04",
    logoUrl: `${siteUrl.replace(/\/$/, "")}/images/logo.png`,
    siteUrl,
    phone: "",
    email: "",
    address: "",
    hours: "",
    rccm: "",
    ncc: "",
  };
}

export function buildInvoicePdfHtml(
  invoice: Invoice,
  siteUrl: string,
  options?: InvoicePdfOptions,
): string {
  const company = options?.company ?? buildDefaultCompany(siteUrl);
  const remaining = invoice.total - invoice.paidAmount;
  const statusLabel = INVOICE_STATUS_LABELS[invoice.status];
  const statusBg = statusColor(invoice.status);

  const lines = invoice.lines.length
    ? invoice.lines
        .map(
          (line, index) =>
            `<tr style="background:${index % 2 === 0 ? "#ffffff" : "#f8fafc"}">
              <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#1e293b">${escapeHtml(line.label)}</td>
              <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:14px;font-weight:600;color:#0f172a;white-space:nowrap">${formatInvoiceAmount(line.amount, invoice.currency)}</td>
            </tr>`,
        )
        .join("")
    : `<tr><td colspan="2" style="padding:16px;color:#64748b;font-size:14px">Aucune ligne</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Facture ${escapeHtml(invoice.reference)} — ${escapeHtml(company.agencyName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #0f172a;
      max-width: 820px;
      margin: 0 auto;
      padding: 32px 28px 40px;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      body { margin: 0; padding: 0; }
    }
  </style>
</head>
<body>
  ${buildCompanyHeader(company)}

  <section style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:28px">
    <div>
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${company.primaryColor}">Facture</p>
      <h1 style="margin:0;font-size:28px;font-weight:800;letter-spacing:-0.03em;color:#0f172a">${escapeHtml(invoice.reference)}</h1>
      <p style="margin:10px 0 0;font-size:13px;color:#64748b;line-height:1.6">
        Émise le ${formatInvoiceDate(invoice.createdAt)}
        ${invoice.dueDate ? `<br/>Échéance : <strong style="color:#334155">${formatInvoiceDate(invoice.dueDate)}</strong>` : ""}
      </p>
    </div>
    <div style="text-align:right">
      <span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${statusBg};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase">${escapeHtml(statusLabel)}</span>
    </div>
  </section>

  <section style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px">
    <div style="padding:18px 20px;border-radius:14px;border:1px solid #e2e8f0;background:#f8fafc">
      <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b">Facturé à</p>
      <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a">${escapeHtml(invoice.name)}</p>
      ${invoice.company ? `<p style="margin:6px 0 0;font-size:13px;color:#475569">${escapeHtml(invoice.company)}</p>` : ""}
      <p style="margin:8px 0 0;font-size:13px;color:#64748b">${escapeHtml(invoice.email)}</p>
    </div>
    <div style="padding:18px 20px;border-radius:14px;border:1px solid #e2e8f0;background:#ffffff">
      <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b">Émetteur</p>
      <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a">${escapeHtml(company.agencyName)}</p>
      ${company.address ? `<p style="margin:6px 0 0;font-size:13px;color:#475569">${escapeHtml(company.address)}</p>` : ""}
      ${company.email ? `<p style="margin:8px 0 0;font-size:13px;color:#64748b">${escapeHtml(company.email)}</p>` : ""}
    </div>
  </section>

  <table style="width:100%;border-collapse:separate;border-spacing:0;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:24px">
    <thead>
      <tr style="background:${company.primaryColor};color:#ffffff">
        <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">Prestation</th>
        <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;width:140px">Montant HT</th>
      </tr>
    </thead>
    <tbody>${lines}</tbody>
  </table>

  <section style="display:flex;justify-content:flex-end;margin-bottom:28px">
    <div style="min-width:280px;padding:20px 22px;border-radius:14px;border:1px solid #e2e8f0;background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%)">
      <div style="display:flex;justify-content:space-between;gap:24px;padding:6px 0;font-size:13px;color:#64748b">
        <span>Sous-total HT</span>
        <span style="font-weight:600;color:#334155">${formatInvoiceAmount(invoice.subtotal, invoice.currency)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;gap:24px;padding:6px 0;font-size:13px;color:#64748b">
        <span>TVA (${invoice.tvaRate} %)</span>
        <span style="font-weight:600;color:#334155">${formatInvoiceAmount(invoice.tvaAmount, invoice.currency)}</span>
      </div>
      <div style="height:1px;background:#e2e8f0;margin:10px 0"></div>
      <div style="display:flex;justify-content:space-between;gap:24px;padding:4px 0;font-size:18px;font-weight:800;color:${company.primaryColor}">
        <span>Total TTC</span>
        <span>${formatInvoiceAmount(invoice.total, invoice.currency)}</span>
      </div>
      ${
        invoice.paidAmount > 0
          ? `
      <div style="display:flex;justify-content:space-between;gap:24px;padding:8px 0 0;font-size:13px;color:#059669">
        <span>Payé</span>
        <span style="font-weight:700">${formatInvoiceAmount(invoice.paidAmount, invoice.currency)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;gap:24px;padding:4px 0;font-size:14px;font-weight:700;color:${remaining > 0 ? company.accentColor : "#059669"}">
        <span>Reste dû</span>
        <span>${formatInvoiceAmount(remaining, invoice.currency)}</span>
      </div>`
          : ""
      }
    </div>
  </section>

  ${
    invoice.notes
      ? `<section style="margin-bottom:24px;padding:16px 18px;border-radius:12px;border-left:4px solid ${company.primaryColor};background:#f8fafc">
      <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b">Notes</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#475569">${escapeHtml(invoice.notes)}</p>
    </section>`
      : ""
  }

  ${
    options?.paymentInstructionsHtml
      ? `<section style="margin-bottom:28px">
      <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${company.primaryColor}">Modalités de règlement</p>
      ${options.paymentInstructionsHtml}
    </section>`
      : ""
  }

  <footer style="margin-top:36px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center">
    <p style="margin:0;font-size:13px;font-weight:600;color:#334155">${escapeHtml(company.agencyName)} — Merci pour votre confiance.</p>
    <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;line-height:1.6">
      ${[company.address, company.phone, company.email].filter(Boolean).map((v) => escapeHtml(v)).join(" · ")}
    </p>
    ${
      company.rccm || company.ncc
        ? `<p style="margin:6px 0 0;font-size:10px;color:#cbd5e1">${[
            company.rccm ? `RCCM ${escapeHtml(company.rccm)}` : "",
            company.ncc ? `NCC ${escapeHtml(company.ncc)}` : "",
          ]
            .filter(Boolean)
            .join(" · ")}</p>`
        : ""
    }
  </footer>
  ${options?.forArchive ? "" : "<script>window.onload=function(){window.print()}</script>"}
</body>
</html>`;

  return injectVerificationBlock(html, options?.verification);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
