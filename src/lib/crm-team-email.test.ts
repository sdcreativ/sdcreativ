import { describe, expect, it, vi } from "vitest";
import {
  allocateUniqueTeamEmailLocalPart,
  buildTeamEmail,
  generateMailboxPassword,
  isCrmTeamEmail,
  isTeamEmailTaken,
  normalizeTeamEmailLocalPart,
  suggestTeamEmailLocalPartFromName,
} from "@/lib/crm-team-email";

describe("crm-team-email", () => {
  it("normalise la partie locale", () => {
    expect(normalizeTeamEmailLocalPart(" Marie.Dupont ")).toBe("marie.dupont");
  });

  it("construit l'email équipe", () => {
    expect(buildTeamEmail("marie", "sdcreativ.com")).toBe("marie@sdcreativ.com");
  });

  it("suggère prenom.nom depuis le nom complet", () => {
    expect(suggestTeamEmailLocalPartFromName("Marie Koné")).toBe("marie.kone");
    expect(suggestTeamEmailLocalPartFromName("Jean-Pierre Dupont")).toBe("jeanpierre.dupont");
    expect(suggestTeamEmailLocalPartFromName("Awa")).toBe("awa");
    expect(suggestTeamEmailLocalPartFromName("  ")).toBe("");
  });

  it("alloue un email unique avec suffixe aléatoire", () => {
    vi.spyOn(crypto, "getRandomValues").mockImplementation((array) => {
      const view = array as Uint8Array;
      for (let i = 0; i < view.length; i++) view[i] = 0;
      return array;
    });

    const local = allocateUniqueTeamEmailLocalPart("marie.kone", [], "sdcreativ.com");
    expect(local).toBe("marie.kone.aaaa");
    expect(isCrmTeamEmail(`${local}@sdcreativ.com`, "sdcreativ.com")).toBe(true);

    vi.restoreAllMocks();
  });

  it("évite les emails déjà pris", () => {
    let call = 0;
    vi.spyOn(crypto, "getRandomValues").mockImplementation((array) => {
      const view = array as Uint8Array;
      const fill = call === 0 ? 0 : 1;
      call += 1;
      for (let i = 0; i < view.length; i++) view[i] = fill;
      return array;
    });

    const taken = ["marie.kone.aaaa@sdcreativ.com"];
    const local = allocateUniqueTeamEmailLocalPart("marie.kone", taken, "sdcreativ.com");
    expect(local).toBe("marie.kone.bbbb");
    expect(isTeamEmailTaken(`${local}@sdcreativ.com`, taken)).toBe(false);

    vi.restoreAllMocks();
  });

  it("génère un mot de passe boîte mail de 14 caractères", () => {
    const pwd = generateMailboxPassword();
    expect(pwd.length).toBe(14);
    expect(/[A-Z]/.test(pwd)).toBe(true);
    expect(/[a-z]/.test(pwd)).toBe(true);
    expect(/[0-9]/.test(pwd)).toBe(true);
  });

  it("accepte les emails @sdcreativ.com valides", () => {
    expect(isCrmTeamEmail("marie@sdcreativ.com", "sdcreativ.com")).toBe(true);
    expect(isCrmTeamEmail("marie.dupont@sdcreativ.com", "sdcreativ.com")).toBe(true);
  });

  it("refuse les emails personnels ou mal formés", () => {
    expect(isCrmTeamEmail("marie@gmail.com", "sdcreativ.com")).toBe(false);
    expect(isCrmTeamEmail("marie@sdcreativ.fr", "sdcreativ.com")).toBe(false);
    expect(isCrmTeamEmail("marie..dupont@sdcreativ.com", "sdcreativ.com")).toBe(false);
    expect(isCrmTeamEmail("@sdcreativ.com", "sdcreativ.com")).toBe(false);
  });
});
