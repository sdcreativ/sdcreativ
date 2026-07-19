import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getThreeCxWidgetConfig,
  isThreeCxPriorityPath,
  parseThreeCxLiveChatLink,
  shouldMountThreeCxWidget,
  shouldShowAiAssistant,
} from "@/lib/threecx/widget-config";

describe("threecx widget-config Phase 2", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parse une URL callus avec hash party", () => {
    expect(
      parseThreeCxLiveChatLink(
        "https://sdcreativ.3cx.fr/callus/#LiveChat800",
        null,
      ),
    ).toEqual({
      phonesystemUrl: "https://sdcreativ.3cx.fr",
      party: "LiveChat800",
    });
  });

  it("parse party + FQDN séparés", () => {
    expect(parseThreeCxLiveChatLink("LiveChat800", "sdcreativ.3cx.fr")).toEqual({
      phonesystemUrl: "https://sdcreativ.3cx.fr",
      party: "LiveChat800",
    });
  });

  it("détecte les pages prioritaires FR/EN", () => {
    expect(isThreeCxPriorityPath("/")).toBe(true);
    expect(isThreeCxPriorityPath("/services/site-vitrine")).toBe(true);
    expect(isThreeCxPriorityPath("/en/training")).toBe(true);
    expect(isThreeCxPriorityPath("/formations/web")).toBe(true);
    expect(isThreeCxPriorityPath("/blog")).toBe(false);
    expect(isThreeCxPriorityPath("/admin/crm")).toBe(false);
  });

  it("ne monte pas sans flag enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_THREE_CX_ENABLED", "false");
    vi.stubEnv(
      "NEXT_PUBLIC_THREE_CX_LIVE_CHAT_LINK",
      "https://sdcreativ.3cx.fr/callus/#LiveChat800",
    );
    expect(getThreeCxWidgetConfig()).toBeNull();
    expect(
      shouldMountThreeCxWidget({
        pathname: "/",
        date: new Date("2026-07-20T10:00:00+00:00"),
        ignoreHours: true,
      }),
    ).toBe(false);
  });

  it("monte en heures ouvrées sur page prioritaire quand enabled", () => {
    const config = {
      enabled: true as const,
      phonesystemUrl: "https://sdcreativ.3cx.fr",
      party: "LiveChat800",
    };
    expect(
      shouldMountThreeCxWidget({
        pathname: "/contact",
        date: new Date("2026-07-20T10:00:00+00:00"),
        config,
        ignoreHours: false,
      }),
    ).toBe(true);
    expect(
      shouldMountThreeCxWidget({
        pathname: "/contact",
        date: new Date("2026-07-20T20:00:00+00:00"),
        config,
        ignoreHours: false,
      }),
    ).toBe(false);
  });

  it("Phase 7 : IA visible hors / en heures ; masquée seulement si ignore + 3CX", () => {
    expect(
      shouldShowAiAssistant({
        date: new Date("2026-07-20T20:00:00+00:00"),
        threeCxActive: false,
      }),
    ).toBe(true);
    expect(
      shouldShowAiAssistant({
        date: new Date("2026-07-20T10:00:00+00:00"),
        threeCxActive: false,
      }),
    ).toBe(true);
    expect(
      shouldShowAiAssistant({
        date: new Date("2026-07-20T10:00:00+00:00"),
        threeCxActive: true,
        ignoreHours: true,
      }),
    ).toBe(false);
  });
});
