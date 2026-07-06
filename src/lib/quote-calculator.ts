import {
  quoteAddons,
  quotePageTiers,
  quoteProjectTypes,
  type QuoteAddon,
} from "@/content/quote-config";
import { formatFcfa } from "@/lib/format";

export type QuoteInput = {
  projectTypeId: string;
  pageTierId?: string;
  addonIds: string[];
};

export type QuoteLine = {
  label: string;
  amount: number;
};

export type QuoteResult = {
  projectLabel: string;
  lines: QuoteLine[];
  subtotal: number;
  estimateMin: number;
  estimateMax: number;
  formattedSubtotal: string;
  formattedRange: string;
  note: string;
};

const RANGE_MARGIN = 0.12;

export function getProjectType(id: string) {
  return quoteProjectTypes.find((p) => p.id === id);
}

export function getAvailableAddons(projectTypeId: string): QuoteAddon[] {
  return quoteAddons.filter(
    (addon) => !addon.forProjects || addon.forProjects.includes(projectTypeId),
  );
}

export function calculateQuote(input: QuoteInput): QuoteResult | null {
  const project = getProjectType(input.projectTypeId);
  if (!project) return null;

  const lines: QuoteLine[] = [
    { label: `${project.label} — base`, amount: project.basePrice },
  ];

  if (project.supportsPages && input.pageTierId) {
    const tier = quotePageTiers.find((t) => t.id === input.pageTierId);
    if (tier && tier.extraPrice > 0) {
      lines.push({ label: tier.label, amount: tier.extraPrice });
    }
  }

  for (const addonId of input.addonIds) {
    const addon = quoteAddons.find((a) => a.id === addonId);
    if (!addon) continue;
    if (addon.forProjects && !addon.forProjects.includes(project.id)) continue;
    lines.push({ label: addon.label, amount: addon.price });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const estimateMin = Math.round(subtotal * (1 - RANGE_MARGIN));
  const estimateMax = Math.round(subtotal * (1 + RANGE_MARGIN));

  return {
    projectLabel: project.label,
    lines,
    subtotal,
    estimateMin,
    estimateMax,
    formattedSubtotal: `${formatFcfa(subtotal)} FCFA`,
    formattedRange: `${formatFcfa(estimateMin)} – ${formatFcfa(estimateMax)} FCFA`,
    note: "Estimation indicative HT. Un devis définitif vous sera transmis après étude de votre projet.",
  };
}
