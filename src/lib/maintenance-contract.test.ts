import { describe, expect, it } from "vitest";
import {
  buildMaintenanceClauses,
  formatDateLong,
  maintenancePricing,
  maintenanceSchedule,
  maintenanceSubscriptionTitle,
  maintenanceTermsInputSchema,
  readMaintenanceTerms,
  type MaintenanceTerms,
} from "@/lib/maintenance-contract";
import { isMaintenanceSubscription } from "@/lib/client-benefits-types";
import { buildContractPdfHtml } from "@/lib/signature/contract-pdf";
import type { Contract } from "@/lib/contracts";

const terms: MaintenanceTerms = {
  level: "essentiel",
  siteName: "Site vitrine Exemple",
  siteUrl: "https://exemple.ci",
  includedMonths: 12,
  billingInterval: "monthly",
  priceHt: 25000,
  vatRate: 18,
  noticeDays: 30,
  benefit: { promoCode: "SDC-AWA-7K2Q", percent: 50, startsOn: "2027-10-08", endsOn: "2028-10-08" },
  subscriptionId: null,
};

describe("conditions de maintenance", () => {
  it("1re échéance payante à la fin de la période incluse", () => {
    expect(maintenanceSchedule(terms, "2026-10-08")).toEqual({ startDate: "2026-10-08", paidFrom: "2027-10-08" });
  });

  it("calcule le TTC et le prix remisé de la période", () => {
    expect(maintenancePricing(terms)).toEqual({ ht: 25000, ttc: 29500, discountedHt: 12500, discountedTtc: 14750 });
    expect(maintenancePricing({ ...terms, benefit: null }).discountedHt).toBeNull();
  });

  it("l'abonnement créé est reconnu comme maintenance (remise auto)", () => {
    const title = maintenanceSubscriptionTitle(terms);
    expect(title).toBe("Maintenance Essentiel — Site vitrine Exemple");
    expect(isMaintenanceSubscription({ title, lines: [] })).toBe(true);
  });

  it("la saisie admin ne peut pas imposer l'avantage ni l'abonnement", () => {
    const parsed = maintenanceTermsInputSchema.parse({ ...terms, benefit: { percent: 100 }, subscriptionId: "x" });
    expect(parsed).not.toHaveProperty("benefit");
    expect(parsed).not.toHaveProperty("subscriptionId");
  });

  it("ignore des métadonnées invalides (contrat classique)", () => {
    expect(readMaintenanceTerms({})).toBeNull();
    expect(readMaintenanceTerms({ maintenance: { level: "x" } })).toBeNull();
    expect(readMaintenanceTerms({ maintenance: terms })).toEqual(terms);
  });

  it("formate les dates sans décalage de fuseau", () => {
    expect(formatDateLong("2027-10-08")).toBe("8 octobre 2027");
  });
});

describe("clauses", () => {
  const clauses = buildMaintenanceClauses(terms, { startDate: "2026-10-08", clientName: "Exemple SARL" });
  const text = clauses.flatMap((c) => [c.title, ...c.paragraphs, ...(c.bullets ?? [])]).join("\n");

  it("précise période incluse, rythme choisi, prix et préavis", () => {
    expect(text).toContain("Les 12 premiers mois de maintenance sont compris dans le prix de création du site");
    expect(text).toContain("jusqu'au 8 octobre 2027");
    expect(text).toContain("facturation mensuelle");
    expect(text).toMatch(/25\s000\sFCFA HT par mois, soit 29\s500\sFCFA TTC \(TVA 18 %\)/);
    expect(text).toContain("préavis de 30 jours");
    expect(text).toContain("facturés directement au Client par l'hébergeur (Hostinger)");
  });

  it("reprend l'avantage promis avec son code", () => {
    expect(clauses.map((c) => c.title)).toContain("Avantage accordé");
    expect(text).toContain("remise de 50 % sur la maintenance du 8 octobre 2027 au 8 octobre 2028");
    expect(text).toContain("SDC-AWA-7K2Q");
  });

  it("sans avantage, pas d'article dédié", () => {
    const titles = buildMaintenanceClauses({ ...terms, benefit: null }, { startDate: "2026-10-08", clientName: "X" }).map((c) => c.title);
    expect(titles).not.toContain("Avantage accordé");
  });
});

describe("document PDF", () => {
  const contract = {
    id: "c1",
    reference: "CTR-2026-0001",
    clientId: "cl1",
    clientName: "Exemple <SARL>",
    projectId: null,
    projectName: null,
    quoteId: null,
    title: "Contrat de maintenance — site vitrine",
    status: "draft",
    startDate: "2026-10-08",
    endDate: null,
    amount: 29500,
    reminderDaysBefore: 30,
    signedAt: null,
    sentAt: null,
    notes: null,
    metadata: { maintenance: terms },
    createdAt: "2026-10-08T10:00:00.000Z",
    updatedAt: "2026-10-08T10:00:00.000Z",
  } as unknown as Contract;

  it("rend le contrat complet sur papier à en-tête, client échappé", () => {
    const html = buildContractPdfHtml(contract, "https://sdcreativ.com");
    expect(html).toContain('id="sd-letterhead-header"');
    expect(html).toContain("Article 1 — Objet");
    expect(html).toContain("Exemple &lt;SARL&gt;");
    expect(html).not.toContain("Exemple <SARL>");
    expect(html).toContain("Pour le Client");
  });

  it("un contrat classique garde sa mise en page", () => {
    const html = buildContractPdfHtml({ ...contract, metadata: {} }, "https://sdcreativ.com");
    expect(html).not.toContain("Article 1");
  });
});

describe("formulations contractuelles", () => {
  it("reformule les cumuls de niveaux et cite le site", () => {
    const clauses = buildMaintenanceClauses({ ...terms, level: "premium" }, { startDate: "2026-10-08", clientName: "X" });
    const bullets = clauses.find((c) => c.title === "Prestations incluses")!.bullets!;
    expect(bullets[0]).toBe("Toutes les prestations du niveau « Professionnel »");
    expect(bullets).toContain("Interventions illimitées");
    expect(clauses[0]!.paragraphs[0]).toContain("du site internet « Site vitrine Exemple » (https://exemple.ci), réalisé");
  });
});
