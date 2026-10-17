import { afterEach, describe, expect, it, vi } from "vitest";

describe("réservation depuis le chat", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("pré-remplit Cal.com et transmet la référence de conversation", async () => {
    vi.stubEnv("NEXT_PUBLIC_BOOKING_URL", "https://cal.com/sdcreativ/30min");
    const { buildChatBookingUrl } = await import("@/components/chat/ChatBookingOverlay");
    const url = new URL(
      buildChatBookingUrl({ conversationId: "3f2a9c1b-0000-4000-8000-000000000000", notes: "Site e-commerce", name: "Awa", email: "awa@ex.com" })!,
    );
    expect(url.origin + url.pathname).toBe("https://cal.com/sdcreativ/30min");
    expect(url.searchParams.get("embed")).toBe("true");
    expect(url.searchParams.get("name")).toBe("Awa");
    expect(url.searchParams.get("email")).toBe("awa@ex.com");
    expect(url.searchParams.get("notes")).toBe("Site e-commerce");
    expect(url.searchParams.get("metadata[chatConversationId]")).toBe("3f2a9c1b-0000-4000-8000-000000000000");
  });

  it("sans calendrier configuré : pas d'URL (le chat renvoie vers /rendez-vous)", async () => {
    vi.stubEnv("NEXT_PUBLIC_BOOKING_URL", "");
    vi.stubEnv("NEXT_PUBLIC_BOOKING_EMBED_URL", "");
    const { buildChatBookingUrl } = await import("@/components/chat/ChatBookingOverlay");
    expect(buildChatBookingUrl({ conversationId: "x", notes: "" })).toBeNull();
  });
});
