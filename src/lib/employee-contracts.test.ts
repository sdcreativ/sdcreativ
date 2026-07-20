import { describe, expect, it } from "vitest";
import {
  createEmployeeContractSchema,
  updateEmployeeContractSchema,
} from "@/lib/employee-contracts";
import {
  EMPLOYEE_CONTRACT_TYPE_LABELS,
  FIXED_TERM_CONTRACT_TYPES,
} from "@/content/employee-contracts-labels";

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
