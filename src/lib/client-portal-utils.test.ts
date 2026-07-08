import { describe, expect, it } from "vitest";
import {
  alignProjectDisplay,
  computeProgressFromMilestones,
  countMessagesAttention,
  countOpenTickets,
  getProjectStepsFromProgress,
  statusLabelFromMilestones,
} from "@/lib/client-portal-utils";
import type { ProjectStep } from "@/content/client-portal-types";
import type { Ticket } from "@/lib/tickets";

const fiveSteps: ProjectStep[] = [
  { id: 1, label: "Brief validé", status: "done" },
  { id: 2, label: "Design", status: "done" },
  { id: 3, label: "Développement", status: "done" },
  { id: 4, label: "Tests", status: "current" },
  { id: 5, label: "Mise en ligne", status: "upcoming" },
];

function ticket(partial: Partial<Ticket> & Pick<Ticket, "id" | "status" | "category">): Ticket {
  return {
    reference: "TK-001",
    subject: "Sujet test",
    priority: "normal",
    clientId: null,
    portalClientId: "demo",
    clientName: "Client",
    clientEmail: "client@test.com",
    projectId: null,
    projectName: null,
    assignee: null,
    slaDueAt: null,
    resolvedAt: null,
    messageCount: 0,
    lastMessageAt: null,
    metadata: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-06-01T12:00:00.000Z",
    ...partial,
  };
}

describe("computeProgressFromMilestones", () => {
  it("retourne 0 sans jalons", () => {
    expect(computeProgressFromMilestones([])).toBe(0);
  });

  it("compte l'étape courante à moitié", () => {
    expect(computeProgressFromMilestones(fiveSteps)).toBe(70);
  });

  it("retourne 100 quand tous les jalons sont terminés", () => {
    const done = fiveSteps.map((s) => ({ ...s, status: "done" as const }));
    expect(computeProgressFromMilestones(done)).toBe(100);
  });
});

describe("statusLabelFromMilestones", () => {
  it("utilise le fallback sans jalons", () => {
    expect(statusLabelFromMilestones([], "EN PAUSE")).toBe("EN PAUSE");
  });

  it("retourne LIVRÉ si tous les jalons sont done", () => {
    const done = fiveSteps.map((s) => ({ ...s, status: "done" as const }));
    expect(statusLabelFromMilestones(done, "EN TEST")).toBe("LIVRÉ");
  });

  it("dérive EN TEST depuis l'étape courante", () => {
    expect(statusLabelFromMilestones(fiveSteps, "LIVRÉ")).toBe("EN TEST");
  });

  it("corrige un fallback LIVRÉ incohérent", () => {
    const upcomingOnly: ProjectStep[] = fiveSteps.map((s) => ({
      ...s,
      status: s.id === 4 ? "current" : s.id < 4 ? "done" : "upcoming",
    }));
    expect(statusLabelFromMilestones(upcomingOnly, "LIVRÉ")).toBe("EN TEST");
  });
});

describe("alignProjectDisplay", () => {
  it("conserve progress et statut sans jalons CRM", () => {
    expect(alignProjectDisplay(100, "LIVRÉ", null)).toEqual({
      progress: 100,
      statusLabel: "LIVRÉ",
    });
  });

  it("aligne progression et badge avec les jalons", () => {
    expect(alignProjectDisplay(100, "LIVRÉ", fiveSteps)).toEqual({
      progress: 70,
      statusLabel: "EN TEST",
    });
  });
});

describe("getProjectStepsFromProgress", () => {
  it("marque les seuils atteints comme done", () => {
    const steps = getProjectStepsFromProgress(85);
    expect(steps.filter((s) => s.status === "done")).toHaveLength(4);
    expect(steps.find((s) => s.label === "Mise en ligne")?.status).toBe("current");
  });

  it("borne la progression entre 0 et 100", () => {
    expect(getProjectStepsFromProgress(-10)[0].status).toBe("current");
    expect(getProjectStepsFromProgress(150).every((s) => s.status === "done")).toBe(true);
  });
});

describe("countOpenTickets", () => {
  it("compte open, in_progress et waiting_client", () => {
    const tickets = [
      ticket({ id: "1", status: "open", category: "technical" }),
      ticket({ id: "2", status: "closed", category: "technical" }),
      ticket({ id: "3", status: "waiting_client", category: "project" }),
    ];
    expect(countOpenTickets(tickets)).toBe(2);
  });
});

describe("countMessagesAttention", () => {
  it("ne compte que les tickets projet ouverts ou en attente client", () => {
    const tickets = [
      ticket({ id: "1", status: "open", category: "project" }),
      ticket({ id: "2", status: "open", category: "technical" }),
      ticket({ id: "3", status: "waiting_client", category: "project" }),
      ticket({ id: "4", status: "closed", category: "project" }),
    ];
    expect(countMessagesAttention(tickets)).toBe(2);
  });
});
