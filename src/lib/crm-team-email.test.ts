import { describe, expect, it } from "vitest";
import {
  buildTeamEmail,
  isCrmTeamEmail,
  normalizeTeamEmailLocalPart,
} from "@/lib/crm-team-email";

describe("crm-team-email", () => {
  it("normalise la partie locale", () => {
    expect(normalizeTeamEmailLocalPart(" Marie.Dupont ")).toBe("marie.dupont");
  });

  it("construit l'email équipe", () => {
    expect(buildTeamEmail("marie", "sdcreativ.com")).toBe("marie@sdcreativ.com");
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
