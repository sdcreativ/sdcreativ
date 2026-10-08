import { describe, expect, it } from "vitest";
import {
  addMonths,
  applyBenefitToLines,
  benefitAppliesOn,
  benefitWindow,
  hasBenefit,
  isMaintenanceSubscription,
} from "@/lib/client-benefits-types";

describe("dates de l'avantage", () => {
  it("ajoute des mois en gérant les fins de mois", () => {
    expect(addMonths("2026-10-08", 12)).toBe("2027-10-08");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
  });

  it("2e année : du 12e au 24e mois après la signature", () => {
    expect(benefitWindow("2026-10-08", 12, 12)).toEqual({ startsOn: "2027-10-08", endsOn: "2028-10-08" });
  });

  it("s'applique uniquement dans la période, et seulement si en attente / en cours", () => {
    const b = { status: "pending" as const, startsOn: "2027-10-08", endsOn: "2028-10-08" };
    expect(benefitAppliesOn(b, "2027-10-07")).toBe(false);
    expect(benefitAppliesOn(b, "2027-10-08")).toBe(true);
    expect(benefitAppliesOn(b, "2028-10-07")).toBe(true);
    expect(benefitAppliesOn(b, "2028-10-08")).toBe(false);
    expect(benefitAppliesOn({ ...b, status: "cancelled" }, "2027-12-01")).toBe(false);
  });
});

describe("promesse structurée", () => {
  it("n'est valable que complète", () => {
    expect(hasBenefit({ kind: "maintenance_discount", percent: 50, startMonths: 12, durationMonths: 12 })).toBe(true);
    expect(hasBenefit({ kind: "none", percent: 50, startMonths: 12, durationMonths: 12 })).toBe(false);
    expect(hasBenefit({ kind: "maintenance_discount", percent: null, startMonths: 12, durationMonths: 12 })).toBe(false);
  });
});

describe("facture de maintenance", () => {
  it("reconnaît un abonnement de maintenance", () => {
    expect(isMaintenanceSubscription({ title: "Maintenance annuelle site", lines: [] })).toBe(true);
    expect(isMaintenanceSubscription({ title: "Contrat", lines: [{ label: "Forfait maintenance" }] })).toBe(true);
    expect(isMaintenanceSubscription({ title: "Hébergement", lines: [], metadata: { kind: "maintenance" } })).toBe(true);
    expect(isMaintenanceSubscription({ title: "Abonnement SEO", lines: [{ label: "Rédaction" }] })).toBe(false);
  });

  it("applique -50 % et cite le code sur chaque ligne", () => {
    const { lines, discount } = applyBenefitToLines(
      [{ label: "Maintenance annuelle", amount: 240000 }, { label: "Sauvegardes", amount: 30001 }],
      50,
      "SDC-AWA-7K2Q",
    );
    expect(lines).toEqual([
      { label: "Maintenance annuelle — remise -50 % (avantage SDC-AWA-7K2Q)", amount: 120000 },
      { label: "Sauvegardes — remise -50 % (avantage SDC-AWA-7K2Q)", amount: 15001 },
    ]);
    expect(discount).toBe(120000 + 15000);
  });
});
