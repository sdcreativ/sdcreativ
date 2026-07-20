import { describe, expect, it } from "vitest";
import { computeClientHealthScore } from "@/lib/client-health";

describe("computeClientHealthScore", () => {
  it("donne un score élevé sans signaux négatifs", () => {
    const result = computeClientHealthScore({
      openTickets: 0,
      slaBreached: 0,
      overdueInvoices: 0,
      unpaidAmount: 0,
      daysSinceLastComm: 3,
      mailThreads30d: 4,
      calls30d: 2,
    });
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.grade).toBe("A");
  });

  it("pénalise SLA et impayés", () => {
    const result = computeClientHealthScore({
      openTickets: 3,
      slaBreached: 2,
      overdueInvoices: 2,
      unpaidAmount: 200_000,
      daysSinceLastComm: 90,
      mailThreads30d: 0,
      calls30d: 0,
    });
    expect(result.score).toBeLessThan(55);
    expect(["D", "E"]).toContain(result.grade);
    expect(result.factors).toHaveLength(4);
  });
});
