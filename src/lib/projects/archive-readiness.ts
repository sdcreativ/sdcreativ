import type { Invoice } from "@/lib/invoices";
import type { Project } from "@/lib/projects";
import type { Quote } from "@/lib/quotes";

export type ArchiveChecklistItem = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

export type ArchiveReadiness = {
  canArchive: boolean;
  alreadyArchived: boolean;
  checklist: ArchiveChecklistItem[];
  blockers: string[];
};

const QUOTE_OK_STATUSES = new Set(["signed", "accepted", "validated", "invoiced"]);

/** Évaluation pure des préconditions d’archivage (testable sans DB). */
export function evaluateArchiveReadiness(input: {
  project: Pick<Project, "status" | "archivedAt" | "name">;
  quote: Pick<Quote, "id" | "reference" | "status"> | null;
  invoices: Array<Pick<Invoice, "id" | "reference" | "status" | "total" | "paidAmount">>;
}): ArchiveReadiness {
  const { project, quote, invoices } = input;
  const alreadyArchived = Boolean(project.archivedAt);

  const checklist: ArchiveChecklistItem[] = [
    {
      id: "delivered",
      label: "Projet livré",
      ok: project.status === "delivered",
      detail:
        project.status === "delivered"
          ? undefined
          : `Statut actuel : ${project.status}`,
    },
    {
      id: "quote",
      label: "Devis lié signé / validé / facturé",
      ok: Boolean(quote && QUOTE_OK_STATUSES.has(quote.status)),
      detail: quote
        ? `${quote.reference} (${quote.status})`
        : "Aucun devis lié au projet",
    },
    {
      id: "invoices",
      label: "Factures du dossier entièrement soldées",
      ok:
        invoices.length > 0 &&
        invoices.every((inv) => inv.status === "paid" || inv.paidAmount >= inv.total),
      detail:
        invoices.length === 0
          ? "Aucune facture liée"
          : invoices
              .map(
                (inv) =>
                  `${inv.reference}: ${inv.status}${
                    inv.status !== "paid" ? ` (payé ${inv.paidAmount}/${inv.total})` : ""
                  }`,
              )
              .join(" · "),
    },
  ];

  const blockers = checklist.filter((c) => !c.ok).map((c) => c.label);
  if (alreadyArchived) {
    blockers.unshift("Dossier déjà archivé");
  }

  return {
    canArchive: !alreadyArchived && checklist.every((c) => c.ok),
    alreadyArchived,
    checklist,
    blockers,
  };
}
