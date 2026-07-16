import { describe, expect, it } from "vitest";
import {
  extractMailboxEmailFromWebhook,
  isMessageReceivedEvent,
} from "@/lib/mail/webhook-payload";

describe("extractMailboxEmailFromWebhook", () => {
  it("lit mailbox / email directs", () => {
    expect(
      extractMailboxEmailFromWebhook({ mailbox: "contact@sdcreativ.com" }),
    ).toBe("contact@sdcreativ.com");
    expect(
      extractMailboxEmailFromWebhook({ email: "Jean <jean@sdcreativ.com>" }),
    ).toBe("jean@sdcreativ.com");
  });

  it("lit message.to (AgentMail-like)", () => {
    expect(
      extractMailboxEmailFromWebhook({
        event_type: "message.received",
        message: {
          to: ["Support <contact@sdcreativ.com>"],
          from: "Client <client@example.com>",
        },
      }),
    ).toBe("contact@sdcreativ.com");
  });

  it("retourne null si aucune adresse", () => {
    expect(extractMailboxEmailFromWebhook({})).toBeNull();
  });
});

describe("isMessageReceivedEvent", () => {
  it("accepte message.received et payloads de test vides", () => {
    expect(isMessageReceivedEvent({ event_type: "message.received" })).toBe(true);
    expect(isMessageReceivedEvent({})).toBe(true);
    expect(isMessageReceivedEvent({ event: "message.sent" })).toBe(false);
  });
});
