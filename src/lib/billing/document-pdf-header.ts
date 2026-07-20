import type { InvoiceDocumentCompany } from "@/lib/billing/document-company";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** En-tête société + logo pour PDF devis / factures / contrats. */
export function buildDocumentCompanyHeader(company: InvoiceDocumentCompany): string {
  const legalParts: string[] = [];
  if (company.rccm.trim()) legalParts.push(`RCCM : ${escapeHtml(company.rccm.trim())}`);
  if (company.ncc.trim()) legalParts.push(`NCC : ${escapeHtml(company.ncc.trim())}`);

  const logoSrc = company.logoUrl.startsWith("data:")
    ? company.logoUrl
    : escapeHtml(company.logoUrl);

  return `
  <header style="margin-bottom:32px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:28px 32px;border-radius:16px;background:linear-gradient(135deg, ${company.primaryColor} 0%, #071525 100%);color:#ffffff">
      <div style="display:flex;align-items:center;gap:20px;min-width:0">
        <div style="flex-shrink:0;display:flex;align-items:center;justify-content:center;width:88px;height:88px;border-radius:14px;background:rgba(255,255,255,0.98);padding:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12)">
          <img src="${logoSrc}" alt="${escapeHtml(company.agencyName)}" style="max-width:100%;max-height:100%;object-fit:contain" />
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

export function buildDefaultDocumentCompany(siteUrl: string): InvoiceDocumentCompany {
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
