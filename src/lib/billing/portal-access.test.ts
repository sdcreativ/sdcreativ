import { describe, expect, it } from "vitest";
import { hashSignaturePayload, isQuoteExpired, PORTAL_SIGNABLE_STATUSES } from "@/lib/billing/portal-access";
import type { Quote } from "@/lib/quotes";

function quoteStub(overrides: Partial<Quote> = {}): Quote {
  return {
    id: "q1",
    reference: "DEV-001",
    leadId: null,
    clientId: "c1",
    name: "Client",
    email: "c@example.com",
    phone: null,
    company: null,
    projectTypeId: null,
    projectLabel: "Projet",
    pageTierId: null,
    addonIds: [],
    lines: [],
    subtotal: 0,
    estimateMin: null,
    estimateMax: null,
    budget: null,
    timeline: null,
    message: null,
    status: "sent",
    sentAt: null,
    followUpAt: null,
    validUntil: null,
    viewedAt: null,
    signedAt: null,
    validatedAt: null,
    rejectionReason: null,
    rejectedAt: null,
    rejectedBy: null,
    notes: null,
    metadata: {},
    currency: "XOF",
    exchangeRateToXof: null,
    exchangeRateAt: null,
    legalEntityId: null,
    projectId: null,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("billing/portal-access", () => {
  it("expose les statuts signables", () => {
    expect(PORTAL_SIGNABLE_STATUSES).toContain("sent");
    expect(PORTAL_SIGNABLE_STATUSES).toContain("viewed");
    expect(PORTAL_SIGNABLE_STATUSES).not.toContain("signed");
  });

  it("détecte l’expiration", () => {
    expect(isQuoteExpired(quoteStub({ validUntil: null }))).toBe(false);
    expect(isQuoteExpired(quoteStub({ validUntil: "2099-01-01T00:00:00.000Z" }))).toBe(false);
    expect(isQuoteExpired(quoteStub({ validUntil: "2020-01-01T00:00:00.000Z" }))).toBe(true);
  });

  it("hash la preuve de signature de façon stable", () => {
    const input = {
      quoteId: "q1",
      signerName: "Ada",
      signerEmail: "ada@example.com",
      signedAt: "2026-07-18T12:00:00.000Z",
      signatureData: "data:image/png;base64,abc",
    };
    const a = hashSignaturePayload(input);
    const b = hashSignaturePayload(input);
    expect(a).toHaveLength(64);
    expect(a).toBe(b);
    expect(hashSignaturePayload({ ...input, signerName: "Bob" })).not.toBe(a);
  });
});
