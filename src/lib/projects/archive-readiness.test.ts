import { describe, expect, it } from "vitest";
import { evaluateArchiveReadiness } from "@/lib/projects/archive-readiness";

describe("evaluateArchiveReadiness", () => {
  const baseProject = {
    name: "Site vitrine",
    status: "delivered" as const,
    archivedAt: null,
  };

  it("autorise l’archive quand tout est prêt", () => {
    const result = evaluateArchiveReadiness({
      project: baseProject,
      quote: { id: "q1", reference: "DEV-1", status: "invoiced" },
      invoices: [
        {
          id: "i1",
          reference: "FAC-1",
          status: "paid",
          total: 1000,
          paidAmount: 1000,
        },
      ],
    });
    expect(result.canArchive).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("bloque si le projet n’est pas livré", () => {
    const result = evaluateArchiveReadiness({
      project: { ...baseProject, status: "development" },
      quote: { id: "q1", reference: "DEV-1", status: "signed" },
      invoices: [
        { id: "i1", reference: "FAC-1", status: "paid", total: 100, paidAmount: 100 },
      ],
    });
    expect(result.canArchive).toBe(false);
    expect(result.blockers).toContain("Projet livré");
  });

  it("bloque sans devis lié valide", () => {
    const result = evaluateArchiveReadiness({
      project: baseProject,
      quote: null,
      invoices: [
        { id: "i1", reference: "FAC-1", status: "paid", total: 100, paidAmount: 100 },
      ],
    });
    expect(result.canArchive).toBe(false);
    expect(result.blockers).toContain("Devis lié signé / validé / facturé");
  });

  it("bloque si une facture n’est pas soldée", () => {
    const result = evaluateArchiveReadiness({
      project: baseProject,
      quote: { id: "q1", reference: "DEV-1", status: "signed" },
      invoices: [
        { id: "i1", reference: "FAC-1", status: "sent", total: 100, paidAmount: 40 },
      ],
    });
    expect(result.canArchive).toBe(false);
    expect(result.blockers).toContain("Factures du dossier entièrement soldées");
  });

  it("bloque si déjà archivé", () => {
    const result = evaluateArchiveReadiness({
      project: { ...baseProject, archivedAt: "2026-01-01T00:00:00.000Z" },
      quote: { id: "q1", reference: "DEV-1", status: "invoiced" },
      invoices: [
        { id: "i1", reference: "FAC-1", status: "paid", total: 100, paidAmount: 100 },
      ],
    });
    expect(result.canArchive).toBe(false);
    expect(result.alreadyArchived).toBe(true);
  });
});
