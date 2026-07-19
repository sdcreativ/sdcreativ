import { describe, expect, it } from "vitest";
import {
  getAiGreeting,
  resolveAiCommsMode,
  THREECX_AI_PRODUCT_RULE,
} from "@/lib/threecx/ai-coexistence";

describe("ai-coexistence Phase 7", () => {
  it("expose une règle produit", () => {
    expect(THREECX_AI_PRODUCT_RULE.id).toBe("hours_split_coexistence");
    expect(THREECX_AI_PRODUCT_RULE.summaryFr.length).toBeGreaterThan(40);
  });

  it("handoff en heures ouvrées si 3CX actif", () => {
    // lundi 10h Abidjan
    const mode = resolveAiCommsMode({
      date: new Date("2026-07-20T10:00:00+00:00"),
      threeCxActive: true,
    });
    expect(mode).toBe("handoff");
    const g = getAiGreeting(mode);
    expect(g.openThreeCxLabel).toBeTruthy();
    expect(g.content.toLowerCase()).toContain("conseiller");
  });

  it("after_hours le soir", () => {
    const mode = resolveAiCommsMode({
      date: new Date("2026-07-20T20:00:00+00:00"),
      threeCxActive: false,
    });
    expect(mode).toBe("after_hours");
    const g = getAiGreeting(mode);
    expect(g.links.some((l) => l.href.includes("rendez-vous"))).toBe(true);
    expect(g.links.some((l) => l.href.includes("wa.me"))).toBe(true);
  });

  it("default si heures ouvrées sans 3CX", () => {
    expect(
      resolveAiCommsMode({
        date: new Date("2026-07-20T10:00:00+00:00"),
        threeCxActive: false,
      }),
    ).toBe("default");
  });
});
