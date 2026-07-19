import { describe, expect, it } from "vitest";
import {
  buildCommunicationsStatsCsv,
  classifyCallOutcome,
  type CommunicationsStats,
} from "@/lib/communications-stats";

describe("classifyCallOutcome", () => {
  it("utilise la disposition quand elle est claire", () => {
    expect(classifyCallOutcome("missed", 120, "inbound")).toBe("missed");
    expect(classifyCallOutcome("Answered", 0, "inbound")).toBe("answered");
    expect(classifyCallOutcome("no-answer", null, "inbound")).toBe("missed");
  });

  it("heuristique durée / direction", () => {
    expect(classifyCallOutcome(null, 45, "inbound")).toBe("answered");
    expect(classifyCallOutcome(null, 0, "inbound")).toBe("missed");
    expect(classifyCallOutcome(null, null, "inbound")).toBe("missed");
    expect(classifyCallOutcome(null, 0, "outbound")).toBe("unknown");
  });
});

describe("buildCommunicationsStatsCsv", () => {
  it("exporte un CSV à deux colonnes", () => {
    const stats: CommunicationsStats = {
      period: { from: null, to: new Date().toISOString(), label: "Mars" },
      channel: "all",
      chats: { total: 2, today: 1, thisWeek: 2 },
      calls: {
        total: 3,
        inbound: 2,
        outbound: 1,
        internal: 0,
        answered: 1,
        missed: 1,
        unknown: 1,
        answerRate: 50,
        missRate: 50,
      },
      meetings: { total: 0 },
      avgDurationSec: 90,
      leads: { from3cx: 1, fromOther: 4, liveChat3cx: 1, call3cx: 0 },
      conversion3cx: {
        leads: 1,
        withQuote: 0,
        signed: 0,
        becameClient: 0,
        quoteRate: 0,
        clientRate: 0,
      },
    };
    const csv = buildCommunicationsStatsCsv(stats);
    expect(csv.startsWith("Indicateur,Valeur\n")).toBe(true);
    expect(csv).toContain("Chats aujourd'hui,1");
    expect(csv).toContain("Taux réponse %,50");
  });
});
