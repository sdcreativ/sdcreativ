import { describe, expect, it } from "vitest";
import {
  assertQuoteTransition,
  BillingWorkflowError,
  canPublishQuote,
  computeQuoteValidUntil,
} from "@/lib/billing/workflow";

describe("billing/workflow", () => {
  it("autorise la publication depuis brouillon ou envoyé", () => {
    expect(canPublishQuote("draft")).toBe(true);
    expect(canPublishQuote("sent")).toBe(true);
    expect(canPublishQuote("signed")).toBe(false);
  });

  it("valide les transitions devis", () => {
    expect(() => assertQuoteTransition("draft", "sent")).not.toThrow();
    expect(() => assertQuoteTransition("sent", "viewed")).not.toThrow();
    expect(() => assertQuoteTransition("viewed", "signed")).not.toThrow();
    expect(() => assertQuoteTransition("signed", "validated")).not.toThrow();
    expect(() => assertQuoteTransition("validated", "invoiced")).not.toThrow();
  });

  it("rejette les transitions invalides", () => {
    expect(() => assertQuoteTransition("draft", "signed")).toThrow(BillingWorkflowError);
    expect(() => assertQuoteTransition("invoiced", "sent")).toThrow(BillingWorkflowError);
  });

  it("calcule une validité à 30 jours", () => {
    const from = new Date("2026-07-10T12:00:00Z");
    const until = computeQuoteValidUntil(from);
    expect(until.toISOString().slice(0, 10)).toBe("2026-08-09");
  });
});
