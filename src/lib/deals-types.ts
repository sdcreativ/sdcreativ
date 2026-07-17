import type { QuoteStatus } from "@/content/quotes-labels";

/** Aligné sur LEAD_STATUSES — défini ici pour rester importable côté client. */
export type DealLeadStatus =
  | "new"
  | "contacted"
  | "quote_sent"
  | "signed"
  | "lost";

export type DealStage =
  | "lead"
  | "quote"
  | "client"
  | "project"
  | "invoiced"
  | "lost";

export const DEAL_STAGES: DealStage[] = [
  "lead",
  "quote",
  "client",
  "project",
  "invoiced",
  "lost",
];

export type DealRecord = {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  leadStatus: DealLeadStatus;
  leadAssignee: string | null;
  quoteId: string | null;
  quoteReference: string | null;
  quoteStatus: QuoteStatus | null;
  quoteAmount: number | null;
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
  projectStatus: string | null;
  invoiceCount: number;
  invoicedAmount: number;
  stage: DealStage;
  updatedAt: string;
};
