import type { QuoteAddon } from "@/content/quote-config";
import {
  quoteAddons,
  quotePageTiers,
  quoteProjectTypes,
} from "@/content/quote-config";
import type { SiteQuoteConfigSettings } from "@/lib/site-quote-config-types";
import { formatFcfa } from "@/lib/format";

export type QuoteInput = {
  projectTypeId: string;
  pageTierId?: string;
  addonIds: string[];
};

export type QuoteLine = {
  label: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
  catalogItemId?: string;
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

export type QuoteCalculatorConfig = Pick<
  SiteQuoteConfigSettings,
  "projectTypes" | "pageTiers" | "addons" | "estimateNote"
>;

const RANGE_MARGIN = 0.12;

export const defaultQuoteCalculatorConfig: QuoteCalculatorConfig = {
  projectTypes: quoteProjectTypes,
  pageTiers: quotePageTiers,
  addons: quoteAddons,
  estimateNote:
    "Estimation indicative HT. Un devis définitif vous sera transmis après étude de votre projet.",
};

export function getProjectType(id: string, config: QuoteCalculatorConfig = defaultQuoteCalculatorConfig) {
  return config.projectTypes.find((p) => p.id === id);
}

export function getAvailableAddons(
  projectTypeId: string,
  config: QuoteCalculatorConfig = defaultQuoteCalculatorConfig,
): QuoteAddon[] {
  return config.addons.filter(
    (addon) => !addon.forProjects || addon.forProjects.includes(projectTypeId),
  );
}

export function calculateQuote(
  input: QuoteInput,
  config: QuoteCalculatorConfig = defaultQuoteCalculatorConfig,
): QuoteResult | null {
  const project = getProjectType(input.projectTypeId, config);
  if (!project) return null;

  const lines: QuoteLine[] = [
    { label: `${project.label} — base`, amount: project.basePrice },
  ];

  if (project.supportsPages && input.pageTierId) {
    const tier = config.pageTiers.find((t) => t.id === input.pageTierId);
    if (tier && tier.extraPrice > 0) {
      lines.push({ label: tier.label, amount: tier.extraPrice });
    }
  }

  for (const addonId of input.addonIds) {
    const addon = config.addons.find((a) => a.id === addonId);
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
    note: config.estimateNote,
  };
}
