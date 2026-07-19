import type { Lead, LeadSource, LeadStatus } from "@/lib/leads";

const SOURCE_SCORE: Record<LeadSource, number> = {
  devis: 28,
  presentation_tablet: 30,
  contact: 24,
  call_3cx: 24,
  live_chat_3cx: 22,
  whatsapp: 20,
  manual: 14,
  waitlist: 8,
};

const STATUS_SCORE: Record<LeadStatus, number> = {
  new: 18,
  contacted: 12,
  quote_sent: 22,
  signed: 0,
  lost: 0,
};

/** Score 0–100 pour prioriser les leads (plus haut = plus chaud). */
export function computeLeadScore(lead: Lead): number {
  if (lead.status === "lost" || lead.status === "signed") return lead.status === "signed" ? 100 : 0;

  let score = SOURCE_SCORE[lead.source] ?? 10;

  if (lead.estimatedValue && lead.estimatedValue > 0) {
    score += Math.min(35, Math.floor(lead.estimatedValue / 40_000));
  }

  score += STATUS_SCORE[lead.status] ?? 0;
  if (lead.phone) score += 5;
  if (lead.company) score += 5;
  if (lead.budget && lead.budget.trim().length > 0) score += 4;

  const daysSince = (Date.now() - new Date(lead.createdAt).getTime()) / 86_400_000;
  if (daysSince <= 3) score += 12;
  else if (daysSince <= 7) score += 8;
  else if (daysSince <= 30) score += 4;

  return Math.min(100, Math.max(0, score));
}

export type LeadScoreTier = "hot" | "warm" | "cold";

export function getLeadScoreTier(score: number): LeadScoreTier {
  if (score >= 65) return "hot";
  if (score >= 35) return "warm";
  return "cold";
}

export const LEAD_SCORE_TIER_LABELS: Record<LeadScoreTier, string> = {
  hot: "Priorité haute",
  warm: "Priorité moyenne",
  cold: "Priorité basse",
};

export const LEAD_SCORE_TIER_STYLES: Record<LeadScoreTier, string> = {
  hot: "bg-accent/15 text-accent",
  warm: "bg-amber-100 text-amber-700",
  cold: "bg-gray-light text-gray-text",
};
