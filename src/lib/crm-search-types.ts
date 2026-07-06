export type CrmSearchResultType = "lead" | "client" | "project" | "quote";

export type CrmSearchResult = {
  type: CrmSearchResultType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const TYPE_LABELS: Record<CrmSearchResultType, string> = {
  lead: "Lead",
  client: "Client",
  project: "Projet",
  quote: "Devis",
};

export function getCrmSearchTypeLabel(type: CrmSearchResultType): string {
  return TYPE_LABELS[type];
}
