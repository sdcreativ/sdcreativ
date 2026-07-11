import type { ProjectStep } from "@/content/client-portal-types";
import type { Ticket, TicketMessage } from "@/lib/tickets";

const STEP_LABELS = ["Brief validé", "Design", "Développement", "Tests", "Mise en ligne"] as const;
const STEP_THRESHOLDS = [15, 35, 60, 85, 100];

const MILESTONE_STATUS_HINTS: Array<{ match: RegExp; label: string }> = [
  { match: /brief|découverte|cadrage/i, label: "EN DÉCOUVERTE" },
  { match: /design|maquette|ui/i, label: "EN DESIGN" },
  { match: /développement|dev|intégration/i, label: "EN DÉVELOPPEMENT" },
  { match: /test|recette|qa/i, label: "EN TEST" },
  { match: /mise en ligne|lancement|déploiement|livraison/i, label: "EN LANCEMENT" },
];

function statusFromStepLabel(label: string): string | null {
  for (const { match, label: status } of MILESTONE_STATUS_HINTS) {
    if (match.test(label)) return status;
  }
  return null;
}

/** Seuil au-delà duquel les jalons CRM sont considérés désynchronisés. */
export const MILESTONE_PROGRESS_DRIFT_THRESHOLD = 10;

/** Progression dérivée des jalons CRM (source de vérité côté portail). */
export function computeProgressFromMilestones(steps: ProjectStep[]): number {
  if (steps.length === 0) return 0;
  const done = steps.filter((s) => s.status === "done").length;
  const hasCurrent = steps.some((s) => s.status === "current");
  return Math.round(((done + (hasCurrent ? 0.5 : 0)) / steps.length) * 100);
}

/** Badge statut cohérent avec l'étape courante des jalons. */
export function statusLabelFromMilestones(steps: ProjectStep[], fallback: string): string {
  if (steps.length === 0) return fallback;
  if (steps.every((s) => s.status === "done")) return "LIVRÉ";

  const current = steps.find((s) => s.status === "current");
  if (current) {
    return statusFromStepLabel(current.label) ?? fallback;
  }

  if (fallback === "LIVRÉ") {
    const next = steps.find((s) => s.status === "upcoming");
    if (next) return statusFromStepLabel(next.label) ?? "EN COURS";
    return "EN COURS";
  }

  return fallback;
}

export function alignProjectDisplay(
  progress: number,
  statusLabel: string,
  steps: ProjectStep[] | null | undefined,
): { progress: number; statusLabel: string } {
  if (!steps || steps.length === 0) {
    return { progress, statusLabel };
  }

  const milestoneProgress = computeProgressFromMilestones(steps);
  if (Math.abs(milestoneProgress - progress) > MILESTONE_PROGRESS_DRIFT_THRESHOLD) {
    return { progress, statusLabel };
  }

  return {
    progress: milestoneProgress,
    statusLabel: statusLabelFromMilestones(steps, statusLabel),
  };
}

/** Étapes affichées côté portail — alignées sur la progression CRM admin. */
export function resolvePortalProjectSteps(
  progress: number,
  steps: ProjectStep[] | null | undefined,
): ProjectStep[] {
  if (!steps || steps.length === 0) {
    return getProjectStepsFromProgress(progress);
  }

  const milestoneProgress = computeProgressFromMilestones(steps);
  if (Math.abs(milestoneProgress - progress) > MILESTONE_PROGRESS_DRIFT_THRESHOLD) {
    return getProjectStepsFromProgress(progress);
  }

  return steps;
}

export function getProjectStepsFromProgress(progress: number): ProjectStep[] {
  const clamped = Math.min(100, Math.max(0, progress));
  let foundCurrent = false;

  return STEP_LABELS.map((label, i) => {
    let status: ProjectStep["status"];
    if (clamped >= STEP_THRESHOLDS[i]) {
      status = "done";
    } else if (!foundCurrent) {
      status = "current";
      foundCurrent = true;
    } else {
      status = "upcoming";
    }
    return { id: i + 1, label, status };
  });
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `Il y a ${minutes || 1} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} j`;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(iso));
}

export function ticketsToActivities(tickets: Ticket[]): Array<{ id: string; text: string; time: string }> {
  return tickets.slice(0, 5).map((t) => ({
    id: t.id,
    text:
      t.status === "resolved" || t.status === "closed"
        ? `Ticket ${t.reference} résolu — ${t.subject}`
        : `Ticket ${t.reference} — ${t.subject}`,
    time: formatRelativeTime(t.updatedAt),
  }));
}

export function messagesFromTickets(
  tickets: Ticket[],
  messagesByTicket: Map<string, TicketMessage[]>,
): Array<{ id: string; author: string; content: string; time: string; isClient: boolean }> {
  const sorted = [...tickets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const result: Array<{ id: string; author: string; content: string; time: string; isClient: boolean }> = [];

  for (const ticket of sorted) {
    const messages = messagesByTicket.get(ticket.id) ?? [];
    for (const msg of messages.slice(-2)) {
      result.push({
        id: msg.id,
        author: msg.authorName,
        content: msg.content,
        time: new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(
          new Date(msg.createdAt),
        ),
        isClient: msg.authorType === "client",
      });
    }
    if (result.length >= 4) break;
  }

  return result.slice(0, 4);
}

export function countOpenTickets(tickets: Ticket[]): number {
  return tickets.filter(
    (t) =>
      t.status === "open" ||
      t.status === "in_progress" ||
      t.status === "waiting_client",
  ).length;
}

/** Conversations projet nécessitant l'attention du client. */
export function countMessagesAttention(tickets: Ticket[]): number {
  return tickets.filter(
    (t) =>
      t.category === "project" &&
      t.status !== "closed" &&
      t.status !== "resolved" &&
      (t.status === "waiting_client" || t.status === "open"),
  ).length;
}
