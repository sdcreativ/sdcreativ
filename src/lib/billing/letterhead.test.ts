import { describe, expect, it } from "vitest";
import { applyLetterhead, getLetterheadLogoDataUrl, hasLetterhead, LETTERHEAD, letterheadPdfTemplates, resolveLetterhead } from "@/lib/billing/letterhead";
import { buildQuotePdfHtml, buildSignedQuotePdfHtml } from "@/lib/quote-pdf";
import { buildContractPdfHtml } from "@/lib/signature/contract-pdf";
import type { Quote } from "@/lib/quotes";
import type { Contract } from "@/lib/contracts";

const doc = "<!DOCTYPE html><html><head><title>x</title></head><body><p>Corps</p></body></html>";

describe("papier à en-tête", () => {
  it("embarque le logo d'origine du modèle (data-URI PNG)", () => {
    expect(getLetterheadLogoDataUrl()).toMatch(/^data:image\/png;base64,/);
  });

  it("reprend exactement les mentions du modèle", () => {
    const html = applyLetterhead(doc);
    for (const text of [
      "www.sdcreativ.com",
      "contact@sdcreativ.com",
      "+225 0565911347",
      "+225 0768704858",
      "SDCREATIV",
      "SARL au capital de 1 000 000 F CFA",
      "Abidjan Cocody Angré, 22ème arrondissement SICOGI, LGT 344",
      "RCCM : CI-ABJ-03-2026-B12-06135",
      "IDU : CI-2026-0074317 R",
    ]) {
      expect(html).toContain(text);
    }
    expect(html).toContain("#145BAC"); // filet bleu du modèle
    expect(hasLetterhead(html)).toBe(true);
    expect(hasLetterhead(doc)).toBe(false);
  });

  it("gabarits PDF : styles intacts (pas de guillemets doubles cassant les attributs)", () => {
    const { headerTemplate, footerTemplate } = letterheadPdfTemplates("data:image/png;base64,AAA");
    for (const t of [headerTemplate, footerTemplate]) {
      expect(t).toMatch(/^<div style="[^"]*font-family:'Aptos','Open Sans'[^"]*padding:[^"]*">/);
    }
  });

  it("aperçu : en-tête en haut, pied en bas, avant les gabarits", () => {
    const html = applyLetterhead(doc);
    const top = html.indexOf('class="sd-lh-inline sd-lh-top"');
    const bottom = html.indexOf('class="sd-lh-inline sd-lh-bottom"');
    expect(top).toBeGreaterThan(0);
    expect(top).toBeLessThan(html.indexOf("Corps"));
    expect(html.indexOf("Corps")).toBeLessThan(bottom);
    expect(bottom).toBeLessThan(html.indexOf('id="sd-letterhead-header"'));
  });
});

describe("documents administratifs sur papier à en-tête", () => {
  const quote = {
    id: "q", reference: "DEV-1", name: "Awa", email: "a@x.com", company: null, phone: null, projectLabel: "Site",
    lines: [{ label: "Prestation", amount: 150000 }], subtotal: 150000, status: "sent", currency: "XOF",
    exchangeRateToXof: null, createdAt: "2026-10-08T10:00:00Z", message: null, estimateMin: null, estimateMax: null,
  } as unknown as Quote;

  it("devis : papier à en-tête, sans mention fiscale française", () => {
    const html = buildQuotePdfHtml(quote, "https://sdcreativ.com", { forArchive: true });
    expect(hasLetterhead(html)).toBe(true);
    expect(html).not.toContain("293 B");
    expect(html).toContain(LETTERHEAD.idu);
  });

  it("devis signé : bloc de signature avant le pied de page", () => {
    const html = buildSignedQuotePdfHtml(quote, "https://sdcreativ.com", {
      signerName: "Awa", signedAt: "2026-10-08T10:00:00Z", signatureHash: "abc", signatureDataUrl: "data:image/png;base64,AAA",
    });
    expect(html.indexOf("Signature électronique client")).toBeLessThan(html.indexOf('class="sd-lh-inline sd-lh-bottom"'));
  });

  it("contrat client (maintenance)", () => {
    const html = buildContractPdfHtml(
      { reference: "CTR-1", title: "Contrat de maintenance", clientName: "Awa", projectName: null, amount: 240000, startDate: null, endDate: null, notes: null } as unknown as Contract,
      "https://sdcreativ.com",
    );
    expect(hasLetterhead(html)).toBe(true);
  });
});

describe("papier à en-tête modifiable (Paramètres du site)", () => {
  it("un champ vide reprend la valeur du modèle", () => {
    expect(resolveLetterhead(null)).toEqual({ ...LETTERHEAD, phones: [...LETTERHEAD.phones] });
    expect(resolveLetterhead({ rccm: "  ", letterheadPhone: "", letterheadPhone2: "" }).rccm).toBe(LETTERHEAD.rccm);
    // ancien format du modèle avec puce : la puce est ajoutée au rendu, pas stockée
    expect(resolveLetterhead({ legalForm: "• SARL" }).legalForm).toBe("SARL");
  });

  it("les valeurs saisies remplacent le modèle, échappées dans l'en-tête et le pied", () => {
    const info = resolveLetterhead({
      legalForm: "SARL au capital de 5 000 000 F CFA",
      headOffice: "Abidjan Plateau <Tour A>",
      letterheadPhone: "+225 0102030405",
      ncc: "1234567 A",
    });
    expect(info.phones).toEqual(["+225 0102030405"]);
    expect(info.ncc).toBe("1234567 A");
    const html = applyLetterhead(doc, info);
    expect(html).toContain("SDCREATIV • SARL au capital de 5 000 000 F CFA");
    expect(html).toContain("Abidjan Plateau &lt;Tour A&gt;");
    expect(html).not.toContain("<Tour A>");
    expect(html).not.toContain("+225 0768704858");
  });

  it("le contrat de maintenance reprend NCC et siège saisis", () => {
    const info = resolveLetterhead({ ncc: "1234567 A", headOffice: "Abidjan Plateau" });
    const contract = {
      id: "c", reference: "CTR-1", clientId: "x", clientName: "Client", projectId: null, projectName: null, quoteId: null,
      title: "Maintenance", status: "draft", startDate: "2026-10-08", endDate: null, amount: null, reminderDaysBefore: 30,
      signedAt: null, sentAt: null, notes: null, createdAt: "2026-10-08T10:00:00Z", updatedAt: "2026-10-08T10:00:00Z",
      metadata: { maintenance: { level: "essentiel", siteName: "Site", includedMonths: 12, billingInterval: "yearly", priceHt: 300000, vatRate: 18, noticeDays: 30 } },
    } as unknown as Contract;
    const html = buildContractPdfHtml(contract, "https://sdcreativ.com", undefined, info);
    expect(html).toContain("NCC 1234567 A");
    expect(html).toContain("Siège social : Abidjan Plateau");
  });
});
