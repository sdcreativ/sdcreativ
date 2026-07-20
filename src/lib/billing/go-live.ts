import { validateQuote } from "@/lib/billing/validate-quote";
import { generateInvoiceFromQuote } from "@/lib/billing/generate-invoice";
import type { BillingActor } from "@/lib/billing/types";
import { BillingWorkflowError } from "@/lib/billing/workflow";
import { resolveClientForQuote } from "@/lib/billing/resolve-client";
import { getInvoiceByQuoteId } from "@/lib/invoices";
import { createProject, getProjectById, listProjectMilestones, updateProject, updateProjectMilestone, type Project } from "@/lib/projects";
import { getQuoteById, type Quote } from "@/lib/quotes";
import { evaluateArchiveReadiness, type ArchiveChecklistItem } from "@/lib/projects/archive-readiness";
import { withDb } from "@/lib/db";

const PROJECTABLE_STATUSES = new Set([
  "signed",
  "accepted",
  "validated",
  "invoiced",
]);

export type GoLiveChecklistItem = ArchiveChecklistItem;

export type GoLiveResult = {
  quote: Quote;
  project: Project;
  invoice: { id: string; reference: string } | null;
  invoiceCreated: boolean;
  projectCreated: boolean;
  goLiveMarked: boolean;
  checklist: GoLiveChecklistItem[];
};

export async function evaluateGoLiveChecklist(quoteId: string): Promise<{
  quote: Quote;
  project: Project | null;
  checklist: GoLiveChecklistItem[];
  canLaunch: boolean;
}> {
  const quote = await getQuoteById(quoteId);
  if (!quote) throw new BillingWorkflowError("Devis introuvable.");

  const project = quote.projectId ? await getProjectById(quote.projectId) : null;
  const invoices = await withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      reference: string;
      status: string;
      total: number;
      paid_amount: number;
    }>(
      `SELECT id, reference, status, total, paid_amount FROM invoices WHERE quote_id = $1`,
      [quote.id],
    );
    return rows.map((r) => ({
      id: r.id,
      reference: r.reference,
      status: r.status as "paid" | "sent" | "draft" | "overdue" | "cancelled",
      total: r.total,
      paidAmount: r.paid_amount,
    }));
  });

  const checklist: GoLiveChecklistItem[] = [
    {
      id: "quote_signed",
      label: "Devis signé / accepté / validé",
      ok: PROJECTABLE_STATUSES.has(quote.status),
      detail: `${quote.reference} · ${quote.status}`,
    },
    {
      id: "client",
      label: "Client CRM lié",
      ok: Boolean(quote.clientId),
      detail: quote.clientId ? "Client lié" : "Liez ou créez un client avant le go-live",
    },
    {
      id: "project",
      label: "Projet créé et lié",
      ok: Boolean(project),
      detail: project ? project.name : "Sera créé au lancement",
    },
    {
      id: "invoice",
      label: "Facture émise",
      ok: invoices.length > 0 || quote.status === "invoiced",
      detail:
        invoices.length > 0
          ? invoices.map((i) => i.reference).join(", ")
          : "Sera générée au lancement",
    },
  ];

  if (project) {
    const archive = evaluateArchiveReadiness({
      project,
      quote,
      invoices,
    });
    checklist.push(
      ...archive.checklist.map((item) => ({
        ...item,
        id: `delivery_${item.id}`,
        label: `Livraison — ${item.label}`,
      })),
    );
  }

  return {
    quote,
    project,
    checklist,
    canLaunch: PROJECTABLE_STATUSES.has(quote.status) && Boolean(quote.clientId || quote.email),
  };
}

/** Orchestration 1-clic : valider si besoin → projet → facture → jalon mise en ligne. */
export async function launchQuoteGoLive(input: {
  quoteId: string;
  actor: BillingActor;
  auditActor?: { userId: string | null; name: string; email: string | null };
  createInvoice?: boolean;
  markDelivered?: boolean;
  sendInvoiceEmail?: boolean;
}): Promise<GoLiveResult> {
  let quote = await getQuoteById(input.quoteId);
  if (!quote) throw new BillingWorkflowError("Devis introuvable.");

  if (!PROJECTABLE_STATUSES.has(quote.status)) {
    throw new BillingWorkflowError(
      "Le devis doit être signé, accepté, validé ou facturé pour le go-live.",
    );
  }

  let projectCreated = false;
  let invoiceCreated = false;
  let goLiveMarked = false;

  if (quote.status === "signed" || quote.status === "accepted") {
    const validated = await validateQuote({
      quoteId: quote.id,
      actor: input.actor,
      validatedByUserId: input.auditActor?.userId,
      auditActor: input.auditActor,
      autoGenerateInvoice: false,
    });
    quote = validated.quote;
  }

  const { clientId } = await resolveClientForQuote(quote);
  if (!clientId) {
    throw new BillingWorkflowError("Impossible de résoudre le client pour créer le projet.");
  }

  let project: Project | null = quote.projectId
    ? await getProjectById(quote.projectId)
    : null;

  if (!project) {
    project = await createProject({
      clientId,
      name: quote.projectLabel || `Projet ${quote.reference}`,
      type: "site_vitrine",
      status: "discovery",
      budget: quote.subtotal,
      description: `Créé depuis le devis ${quote.reference}`,
      sourceQuoteId: quote.id,
      seedMilestones: true,
    });
    projectCreated = true;
    quote = (await getQuoteById(quote.id)) ?? quote;
  }

  let invoice: { id: string; reference: string } | null = null;
  const existingInvoice = await getInvoiceByQuoteId(quote.id);
  if (existingInvoice) {
    invoice = { id: existingInvoice.id, reference: existingInvoice.reference };
  } else if (input.createInvoice !== false) {
    if (quote.status === "validated" || quote.status === "accepted") {
      const generated = await generateInvoiceFromQuote({
        quoteId: quote.id,
        actor: input.actor,
        auditActor: input.auditActor,
        sendEmail: input.sendInvoiceEmail !== false,
      });
      invoice = { id: generated.invoice.id, reference: generated.invoice.reference };
      invoiceCreated = !generated.alreadyExists;
      quote = generated.quote;
    }
  }

  if (input.markDelivered && project) {
    const milestones = await listProjectMilestones(project.id);
    const goLive =
      milestones.find((m) => /mise en ligne|go-?live|livraison/i.test(m.label)) ??
      milestones[milestones.length - 1];
    if (goLive && goLive.status !== "done") {
      await updateProjectMilestone(goLive.id, { status: "done" });
    }
    project = (await updateProject(project.id, { status: "delivered", progress: 100 })) ?? project;
    goLiveMarked = true;
  }

  const evaluated = await evaluateGoLiveChecklist(quote.id);

  return {
    quote: evaluated.quote,
    project: evaluated.project ?? project!,
    invoice,
    invoiceCreated,
    projectCreated,
    goLiveMarked,
    checklist: evaluated.checklist,
  };
}
