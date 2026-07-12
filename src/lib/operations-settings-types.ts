export const REPORT_KPI_KEYS = [
  "newLeads",
  "signedLeads",
  "quotesSent",
  "quotesAccepted",
  "revenueQuotes",
  "pipelineValue",
  "activeProjects",
  "activeClients",
] as const;

export type ReportKpiKey = (typeof REPORT_KPI_KEYS)[number];

export const REPORT_KPI_LABELS: Record<ReportKpiKey, string> = {
  newLeads: "Nouveaux leads",
  signedLeads: "Leads signés",
  quotesSent: "Devis envoyés",
  quotesAccepted: "Devis acceptés",
  revenueQuotes: "CA devis",
  pipelineValue: "Pipeline",
  activeProjects: "Projets actifs",
  activeClients: "Clients actifs",
};

export const REPORT_FREQUENCIES = ["weekly", "monthly", "quarterly"] as const;
export type ReportFrequency = (typeof REPORT_FREQUENCIES)[number];

export const REPORT_FREQUENCY_LABELS: Record<ReportFrequency, string> = {
  weekly: "Hebdomadaire",
  monthly: "Mensuel",
  quarterly: "Trimestriel",
};

export type ScheduledReportConfig = {
  id: string;
  enabled: boolean;
  label: string;
  recipients: string[];
  frequency: ReportFrequency;
  kpis: ReportKpiKey[];
  includeComparison: boolean;
  includeCsv: boolean;
  lastSentAt: string | null;
};

export type OperationsSettings = {
  scheduledReports: ScheduledReportConfig[];
};

export const DEFAULT_OPERATIONS_SETTINGS: OperationsSettings = {
  scheduledReports: [],
};
