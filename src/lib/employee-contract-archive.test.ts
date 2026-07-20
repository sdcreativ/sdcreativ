import { describe, expect, it } from "vitest";
import {
  buildEmployeeContractDocumentKey,
  resolveArchiveVariant,
} from "@/lib/employee-contract-archive";
import type { EmployeeContract } from "@/lib/employee-contracts";

function stub(partial: Partial<EmployeeContract>): EmployeeContract {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    reference: "EMP-2026-0001",
    userId: "22222222-2222-4222-8222-222222222222",
    userName: "Test",
    userEmail: "test@example.com",
    contractType: "cdi",
    title: "CDI Test",
    status: "draft",
    startDate: null,
    endDate: null,
    trialEndDate: null,
    jobTitle: null,
    department: null,
    workLocation: null,
    weeklyHours: null,
    compensationAmount: null,
    compensationCurrency: "XOF",
    compensationPeriod: "monthly",
    reminderDaysBefore: 30,
    signedAt: null,
    sentAt: null,
    endedAt: null,
    documentS3Key: null,
    documentName: null,
    notes: null,
    internalReference: null,
    missions: null,
    benefits: [],
    clauses: [],
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
    ...partial,
  };
}

describe("employee contract archive keys", () => {
  it("construit une clé S3 stable par contrat", () => {
    const contract = stub({});
    expect(buildEmployeeContractDocumentKey(contract, "draft", "pdf")).toBe(
      `employee-contracts/${contract.userId}/${contract.id}/EMP-2026-0001.pdf`,
    );
    expect(buildEmployeeContractDocumentKey(contract, "signed", "pdf")).toBe(
      `employee-contracts/${contract.userId}/${contract.id}/EMP-2026-0001-signe.pdf`,
    );
  });

  it("choisit la variante signed pour les statuts finalisés", () => {
    expect(resolveArchiveVariant(stub({ status: "draft" }))).toBe("draft");
    expect(resolveArchiveVariant(stub({ status: "pending_signature" }))).toBe("draft");
    expect(resolveArchiveVariant(stub({ status: "signed" }))).toBe("signed");
    expect(resolveArchiveVariant(stub({ status: "active" }))).toBe("signed");
  });
});
