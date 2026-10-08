import {
  EMPLOYEE_COMPENSATION_PERIOD_LABELS,
  EMPLOYEE_CONTRACT_TYPE_LABELS,
} from "@/content/employee-contracts-labels";
import { applyLetterhead, LETTERHEAD } from "@/lib/billing/letterhead";
import type { InvoiceDocumentCompany } from "@/lib/billing/document-company";
import { formatMoney } from "@/lib/currencies";
import type { SupportedCurrency } from "@/lib/currencies";
import type { EmployeeContract } from "@/lib/employee-contracts";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateFr(value: string | null | undefined): string {
  if (!value) return "non précisée";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(value));
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "—");
}

function buildVars(
  contract: EmployeeContract,
  company: InvoiceDocumentCompany,
): Record<string, string> {
  const compensation =
    contract.compensationAmount != null
      ? `${formatMoney(
          contract.compensationAmount,
          contract.compensationCurrency as SupportedCurrency,
        )} (${EMPLOYEE_COMPENSATION_PERIOD_LABELS[contract.compensationPeriod].toLowerCase()})`
      : "à définir / selon barème applicable";

  const benefitsList =
    contract.benefits.length > 0
      ? contract.benefits.map((b) => `• ${b}`).join("\n")
      : "• Aucun avantage accessoire particulier au-delà de la loi";

  const base: Record<string, string> = {
    employerName: company.agencyName || "SD CREATIV",
    // Repli sur les mentions officielles du papier à en-tête quand les réglages sont vides.
    employerAddress: company.address || LETTERHEAD.headOffice,
    employerEmail: company.email || LETTERHEAD.email,
    employerPhone: company.phone || LETTERHEAD.phones[0],
    employerRccm: company.rccm || LETTERHEAD.rccm,
    employerNcc: company.ncc || "non renseigné",
    employeeName: contract.userName || "Collaborateur",
    employeeEmail: contract.userEmail || "—",
    jobTitle: contract.jobTitle || "Collaborateur",
    department: contract.department ? ` (département ${contract.department})` : "",
    departmentName: contract.department?.trim() || "concernée",
    workLocation: contract.workLocation || "Abidjan / selon organisation de l'Employeur",
    weeklyHours:
      contract.weeklyHours != null ? String(contract.weeklyHours) : "quarante (40)",
    startDate: formatDateFr(contract.startDate),
    endDate: formatDateFr(contract.endDate),
    trialEndDate: formatDateFr(contract.trialEndDate),
    compensation,
    contractType: EMPLOYEE_CONTRACT_TYPE_LABELS[contract.contractType],
    reference: contract.reference,
    internalReference: contract.internalReference
      ? ` / réf. interne ${contract.internalReference}`
      : "",
    benefits: benefitsList,
  };

  return {
    ...base,
    missions: interpolate(
      contract.missions?.trim() || "— Missions à préciser —",
      base,
    ),
  };
}

export function buildEmployeeContractPdfHtml(
  contract: EmployeeContract,
  siteUrl: string,
  signature?: {
    signerName: string;
    signedAt: string;
    signatureHash: string;
    signatureDataUrl: string;
    documentSha256?: string;
  },
  company?: InvoiceDocumentCompany,
): string {
  const resolvedCompany: InvoiceDocumentCompany = company ?? {
    agencyName: "SD CREATIV",
    tagline: "Agence Web & Solutions Digitales",
    primaryColor: "#1e40af",
    accentColor: "#e85d04",
    logoUrl: `${siteUrl.replace(/\/$/, "")}/images/logo.png`,
    siteUrl,
    phone: "",
    email: "contact@sdcreativ.com",
    address: "Abidjan, Côte d'Ivoire",
    hours: "",
    rccm: "",
    ncc: "",
  };

  const vars = buildVars(contract, resolvedCompany);
  const typeLabel = EMPLOYEE_CONTRACT_TYPE_LABELS[contract.contractType];
  const companyHost = resolvedCompany.siteUrl.replace(/^https?:\/\//, "") || siteUrl.replace(/^https?:\/\//, "");

  const clausesHtml = contract.clauses
    .map((clause) => {
      const body = escapeHtml(interpolate(clause.body, vars)).replace(/\n/g, "<br/>");
      return `
      <section style="margin-top:22px">
        <h2 style="font-size:14px;margin:0 0 8px;color:#0f172a">${escapeHtml(interpolate(clause.title, vars))}</h2>
        <p style="margin:0;font-size:12.5px;line-height:1.55;text-align:justify;color:#1e293b">${body}</p>
      </section>`;
    })
    .join("");

  const sigBlock = signature
    ? `
  <div style="margin-top:36px;padding-top:18px;border-top:1px solid #cbd5e1;page-break-inside:avoid">
    <p style="margin:0 0 0.4rem;font-size:13px"><strong>Signature du Collaborateur</strong></p>
    <p style="margin:0 0 0.4rem;font-size:12px"><strong>Nom :</strong> ${escapeHtml(signature.signerName)}</p>
    <p style="margin:0 0 0.4rem;font-size:12px"><strong>Date :</strong> ${escapeHtml(new Date(signature.signedAt).toLocaleString("fr-FR"))}</p>
    <p style="margin:0 0 0.4rem;font-family:monospace;font-size:10px;color:#64748b;word-break:break-all">Empreinte : ${escapeHtml(signature.signatureHash.slice(0, 48))}…</p>
    ${
      signature.documentSha256
        ? `<p style="margin:0 0 0.8rem;font-family:monospace;font-size:10px;color:#64748b;word-break:break-all">SHA-256 : ${escapeHtml(signature.documentSha256.slice(0, 48))}…</p>`
        : ""
    }
    <img src="${signature.signatureDataUrl}" alt="Signature" style="max-height:72px;max-width:260px;border-bottom:1px solid #94a3b8" />
    <p style="margin-top:10px;font-size:10px;color:#94a3b8">Signature électronique ${escapeHtml(resolvedCompany.agencyName)} (preuve métier renforcée) — pour une signature eIDAS à forte valeur, utiliser Yousign.</p>
  </div>`
    : `
  <div style="margin-top:40px;display:flex;gap:40px;page-break-inside:avoid">
    <div style="flex:1;border-top:1px solid #94a3b8;padding-top:10px">
      <p style="margin:0;font-size:12px;font-weight:700">L'Employeur</p>
      <p style="margin:6px 0 0;font-size:11px;color:#64748b">${escapeHtml(resolvedCompany.agencyName)}</p>
      ${
        resolvedCompany.rccm || resolvedCompany.ncc
          ? `<p style="margin:4px 0 0;font-size:10px;color:#94a3b8">${escapeHtml(
              [resolvedCompany.rccm && `RCCM ${resolvedCompany.rccm}`, resolvedCompany.ncc && `NCC ${resolvedCompany.ncc}`]
                .filter(Boolean)
                .join(" · "),
            )}</p>`
          : ""
      }
      <p style="margin:28px 0 0;font-size:11px;color:#94a3b8">Signature &amp; cachet</p>
    </div>
    <div style="flex:1;border-top:1px solid #94a3b8;padding-top:10px">
      <p style="margin:0;font-size:12px;font-weight:700">Le Collaborateur</p>
      <p style="margin:6px 0 0;font-size:11px;color:#64748b">${escapeHtml(vars.employeeName)}</p>
      <p style="margin:28px 0 0;font-size:11px;color:#94a3b8">Lu et approuvé — Signature</p>
    </div>
  </div>`;

  // Papier à en-tête officiel : coordonnées et mentions légales (RCCM, IDU) en en-tête / pied de chaque page.
  return applyLetterhead(`<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"/><title>${escapeHtml(contract.reference)} — Contrat ${escapeHtml(typeLabel)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  html { background: #cbd5e1; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    color: #0f172a;
    margin: 0;
    line-height: 1.5;
    font-size: 12.5px;
  }
  .sheet {
    width: 210mm;
    max-width: 100%;
    min-height: 297mm;
    margin: 24px auto;
    padding: 18mm 16mm;
    background: #ffffff;
    box-shadow: 0 8px 32px rgba(15, 23, 42, 0.18);
  }
  h1 { font-size: 20px; margin: 0 0 6px; letter-spacing: -0.01em; }
  h2 { font-family: system-ui, -apple-system, sans-serif; }
  .eyebrow {
    font-family: system-ui, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${escapeHtml(resolvedCompany.primaryColor)};
    margin: 0 0 8px;
  }
  .meta { color: #64748b; font-size: 12px; margin: 0 0 18px; }
  .card {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 16px;
    background: #f8fafc;
    margin: 16px 0;
  }
  .card table { width: 100%; border-collapse: collapse; }
  .card td { padding: 5px 0; font-size: 12px; vertical-align: top; }
  .card td:first-child {
    color: #64748b;
    width: 38%;
    font-family: system-ui, sans-serif;
  }
  .legal-note {
    margin-top: 28px;
    padding: 12px 14px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 8px;
    font-size: 11px;
    color: #78350f;
    line-height: 1.45;
  }
  .footer {
    margin-top: 28px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    font-size: 10px;
    color: #94a3b8;
    font-family: system-ui, sans-serif;
    line-height: 1.55;
  }
  @media print {
    html { background: #ffffff; }
    .sheet {
      width: auto;
      min-height: 0;
      margin: 0;
      padding: 0;
      box-shadow: none;
    }
  }
  @media (max-width: 860px) {
    .sheet { margin: 0; min-height: 0; padding: 20px 16px; box-shadow: none; }
    html { background: #ffffff; }
  }
</style></head>
<body>
  <div class="sheet">

  <p class="eyebrow">Contrat de travail / engagement — ${escapeHtml(typeLabel)}</p>
  <h1>${escapeHtml(contract.title)}</h1>
  <p class="meta">
    Réf. ${escapeHtml(contract.reference)}
    ${contract.internalReference ? ` · Interne ${escapeHtml(contract.internalReference)}` : ""}
    · Droit applicable : République de Côte d'Ivoire
  </p>

  <div class="card">
    <table>
      <tr><td>Employeur</td><td><strong>${escapeHtml(resolvedCompany.agencyName)}</strong>${resolvedCompany.tagline ? `<br/><span style="color:#64748b">${escapeHtml(resolvedCompany.tagline)}</span>` : ""}<br/>${escapeHtml(resolvedCompany.address || "—")}<br/>${escapeHtml(resolvedCompany.email)}${resolvedCompany.phone ? ` · ${escapeHtml(resolvedCompany.phone)}` : ""}</td></tr>
      <tr><td>Identifiants légaux</td><td>RCCM : ${escapeHtml(resolvedCompany.rccm || LETTERHEAD.rccm)}<br/>IDU : ${escapeHtml(LETTERHEAD.idu)}${resolvedCompany.ncc ? `<br/>NCC : ${escapeHtml(resolvedCompany.ncc)}` : ""}</td></tr>
      <tr><td>Collaborateur</td><td><strong>${escapeHtml(vars.employeeName)}</strong><br/>${escapeHtml(vars.employeeEmail)}</td></tr>
      <tr><td>Poste</td><td>${escapeHtml(contract.jobTitle || "—")}${contract.department ? ` · ${escapeHtml(contract.department)}` : ""}</td></tr>
      <tr><td>Période</td><td>Du ${escapeHtml(formatDateFr(contract.startDate))} au ${escapeHtml(contract.endDate ? formatDateFr(contract.endDate) : "durée indéterminée")}</td></tr>
      <tr><td>Rémunération</td><td>${escapeHtml(vars.compensation)}</td></tr>
      <tr><td>Temps de travail</td><td>${escapeHtml(vars.weeklyHours)} h / semaine</td></tr>
      <tr><td>Lieu</td><td>${escapeHtml(vars.workLocation)}</td></tr>
    </table>
  </div>

  ${clausesHtml}

  <div class="legal-note">
    Le présent document constitue un contrat écrit au sens du Code du travail ivoirien.
    Les parties reconnaissent que les clauses ci-dessus, les avantages listés et les missions décrites
    forment un ensemble cohérent. En cas de contradiction avec une disposition d'ordre public,
    cette dernière prévaut. Document émis par ${escapeHtml(resolvedCompany.agencyName)} — ${escapeHtml(companyHost)}.
  </div>

  ${sigBlock}
  <p class="footer">${escapeHtml(contract.reference)} · ${escapeHtml(typeLabel)} · Exemplaire électronique</p>
  </div>
</body></html>`);
}
