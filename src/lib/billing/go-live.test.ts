import { describe, expect, it } from "vitest";
import { evaluateArchiveReadiness } from "@/lib/projects/archive-readiness";

describe("go-live checklist (archive readiness reuse)", () => {
  it("bloque si projet non livré ou factures ouvertes", () => {
    const result = evaluateArchiveReadiness({
      project: { status: "development", archivedAt: null, name: "Site" },
      quote: { id: "q1", reference: "DEV-1", status: "signed" },
      invoices: [
        { id: "i1", reference: "FAC-1", status: "sent", total: 100, paidAmount: 0 },
      ],
    });
    expect(result.canArchive).toBe(false);
    expect(result.checklist.some((c) => c.id === "delivered" && !c.ok)).toBe(true);
    expect(result.checklist.some((c) => c.id === "invoices" && !c.ok)).toBe(true);
  });

  it("autorise l’archivage quand livré et soldé", () => {
    const result = evaluateArchiveReadiness({
      project: { status: "delivered", archivedAt: null, name: "Site" },
      quote: { id: "q1", reference: "DEV-1", status: "invoiced" },
      invoices: [
        { id: "i1", reference: "FAC-1", status: "paid", total: 100, paidAmount: 100 },
      ],
    });
    expect(result.canArchive).toBe(true);
  });
});
