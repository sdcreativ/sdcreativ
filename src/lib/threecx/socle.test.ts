import { describe, expect, it } from "vitest";
import {
  assessThreeCxSocleReadiness,
  THREECX_CALL_OPTIONS,
  THREECX_PBX_BLUEPRINT,
  THREECX_WIDGET_COPY,
} from "@/lib/threecx/socle";

describe("threecx socle Phase 1", () => {
  it("cible la file Accueil commercial 800 pour le Live Chat", () => {
    expect(THREECX_PBX_BLUEPRINT.liveChatDestinationExtension).toBe("800");
    expect(THREECX_CALL_OPTIONS.allowVisitorAudioCall).toBe(true);
    expect(THREECX_WIDGET_COPY.fr.onlineGreeting.length).toBeGreaterThan(20);
    expect(THREECX_WIDGET_COPY.en.offlineGreeting.length).toBeGreaterThan(20);
  });

  it("n’est pas prêt sans FQDN ni lien chat", () => {
    const r = assessThreeCxSocleReadiness({});
    expect(r.ready).toBe(false);
    expect(r.readyForWidget).toBe(false);
    expect(r.missing).toContain("pbx_fqdn");
    expect(r.missing).toContain("live_chat_link");
  });

  it("rejette un FQDN avec schéma URL", () => {
    const r = assessThreeCxSocleReadiness({
      pbxFqdn: "https://sdcreativ.3cx.fr",
      liveChatLink: "https://sdcreativ.3cx.fr/callus/#chat",
    });
    expect(r.checks.find((c) => c.id === "pbx_fqdn")?.ok).toBe(false);
  });

  it("readyForWidget quand FQDN + lien OK (tests ops optionnels)", () => {
    const r = assessThreeCxSocleReadiness({
      pbxFqdn: "sdcreativ.3cx.fr",
      liveChatLink: "https://sdcreativ.3cx.fr/callus/#partyname",
    });
    expect(r.readyForWidget).toBe(true);
    expect(r.ready).toBe(false);
    expect(r.missing).toEqual(["agents_min", "console_tests"]);
  });

  it("ready complet avec agents + tests console", () => {
    const r = assessThreeCxSocleReadiness({
      pbxFqdn: "sdcreativ.3cx.fr",
      liveChatLink: "https://sdcreativ.3cx.fr/callus/#partyname",
      confirmedAgents: 2,
      consoleTestsPassed: true,
    });
    expect(r.ready).toBe(true);
    expect(r.missing).toEqual([]);
  });
});
