import { describe, expect, it } from "vitest";
import {
  buildDefaultBenefits,
  buildDefaultClauses,
  buildDefaultMissions,
} from "@/content/employee-contract-clauses";
import {
  EMPLOYEE_CONTRACT_TYPE_LABELS,
  EMPLOYEE_CONTRACT_TYPES,
  FIXED_TERM_CONTRACT_TYPES,
} from "@/content/employee-contracts-labels";
import {
  createEmployeeContractSchema,
  updateEmployeeContractSchema,
} from "@/lib/employee-contracts";
import { buildEmployeeContractPdfHtml } from "@/lib/signature/employee-contract-pdf";
import type { EmployeeContract } from "@/lib/employee-contracts";

describe("employee contracts schemas", () => {
  it("accepte un CDI sans date de fin", () => {
    const parsed = createEmployeeContractSchema.safeParse({
      userId: "11111111-1111-4111-8111-111111111111",
      contractType: "cdi",
      title: "Contrat CDI — Dev",
      startDate: "2026-08-01",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepte clauses, avantages et réf. interne", () => {
    const clauses = buildDefaultClauses("cdi");
    const parsed = createEmployeeContractSchema.safeParse({
      userId: "11111111-1111-4111-8111-111111111111",
      contractType: "cdi",
      title: "Contrat CDI — Dev",
      internalReference: "RH-2026-004",
      missions: buildDefaultMissions("cdi"),
      benefits: buildDefaultBenefits("cdi"),
      clauses,
    });
    expect(parsed.success).toBe(true);
  });

  it("refuse un type inconnu", () => {
    const parsed = createEmployeeContractSchema.safeParse({
      userId: "11111111-1111-4111-8111-111111111111",
      contractType: "interim",
      title: "Test",
    });
    expect(parsed.success).toBe(false);
  });

  it("permet de passer un contrat en actif", () => {
    const parsed = updateEmployeeContractSchema.safeParse({ status: "active" });
    expect(parsed.success).toBe(true);
  });
});

describe("employee contract labels", () => {
  it("couvre Stage CDD CDI Alternance", () => {
    expect(EMPLOYEE_CONTRACT_TYPE_LABELS.stage).toBe("Stage");
    expect(EMPLOYEE_CONTRACT_TYPE_LABELS.cdd).toBe("CDD");
    expect(EMPLOYEE_CONTRACT_TYPE_LABELS.cdi).toBe("CDI");
    expect(EMPLOYEE_CONTRACT_TYPE_LABELS.alternance).toBe("Alternance");
    expect(FIXED_TERM_CONTRACT_TYPES).toContain("cdd");
    expect(FIXED_TERM_CONTRACT_TYPES).not.toContain("cdi");
  });
});

describe("employee contract clause templates", () => {
  it("fournit un corps juridique complet pour chaque type", () => {
    for (const type of EMPLOYEE_CONTRACT_TYPES) {
      const clauses = buildDefaultClauses(type);
      expect(clauses.length).toBeGreaterThanOrEqual(14);
      expect(clauses.some((c) => /droit|Côte d'Ivoire|ivoirien/i.test(c.body))).toBe(
        true,
      );
      expect(buildDefaultBenefits(type).length).toBeGreaterThan(0);
      expect(buildDefaultMissions(type).length).toBeGreaterThan(20);
    }
  });

  it("génère un PDF contenant les articles et la base légale", () => {
    const contract = {
      id: "11111111-1111-4111-8111-111111111111",
      reference: "EMP-2026-0001",
      userId: "11111111-1111-4111-8111-111111111112",
      userName: "Ada Lovelace",
      userEmail: "ada@example.com",
      contractType: "cdi" as const,
      title: "Contrat CDI — Ingénieure",
      status: "draft" as const,
      startDate: "2026-08-01",
      endDate: null,
      trialEndDate: "2026-11-01",
      jobTitle: "Ingénieure logicielle",
      department: "Technique",
      workLocation: "Abidjan",
      weeklyHours: 40,
      compensationAmount: 500000,
      compensationCurrency: "XOF",
      compensationPeriod: "monthly" as const,
      reminderDaysBefore: 30,
      signedAt: null,
      sentAt: null,
      endedAt: null,
      documentS3Key: null,
      documentName: null,
      notes: "Note RH interne",
      internalReference: "RH-ADA-001",
      missions: buildDefaultMissions("cdi"),
      benefits: buildDefaultBenefits("cdi"),
      clauses: buildDefaultClauses("cdi"),
      metadata: {},
      signatureProvider: null,
      esignExternalId: null,
      esignDocumentId: null,
      esignSignerEmail: null,
      esignSentAt: null,
      esignCompletedAt: null,
      createdBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      daysUntilEnd: null,
    } satisfies EmployeeContract;

    const html = buildEmployeeContractPdfHtml(contract, "https://sdcreativ.com", undefined, {
      agencyName: "SD CREATIV",
      tagline: "Agence Web & Solutions Digitales",
      primaryColor: "#1e40af",
      accentColor: "#e85d04",
      logoUrl: "https://sdcreativ.com/images/logo.png",
      siteUrl: "https://sdcreativ.com",
      phone: "+225 00 00 00 00",
      email: "contact@sdcreativ.com",
      address: "Abidjan, Côte d'Ivoire",
      hours: "Lun–Ven 9h–18h",
      rccm: "CI-ABJ-2020-B-12345",
      ncc: "1234567A",
    });
    expect(html).toContain('src="https://sdcreativ.com/images/logo.png"');
    expect(html).toContain("Article 1");
    expect(html).toContain("Côte d'Ivoire");
    expect(html).toContain("RH-ADA-001");
    expect(html).toContain("Ingénieure logicielle");
    expect(html).toContain("Couverture sociale");
    expect(html).toContain("CI-ABJ-2020-B-12345");
    expect(html).toContain("1234567A");
    expect(html).not.toContain("Note RH interne");
  });
});
