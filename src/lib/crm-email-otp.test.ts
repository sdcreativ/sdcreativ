import { describe, expect, it } from "vitest";
import {
  generateLoginEmailOtp,
  hashLoginEmailOtp,
  resolveLoginOtpDestination,
} from "@/lib/crm-email-otp";
import { normalizeLoginEmailOtp } from "@/lib/crm-email-otp-utils";

describe("generateLoginEmailOtp", () => {
  it("génère un code au format SD-XXXXXX", () => {
    const code = generateLoginEmailOtp();
    expect(code).toMatch(/^SD-[A-Z2-9]{6}$/);
    expect(code).not.toMatch(/[01IO]/);
  });
});

describe("resolveLoginOtpDestination", () => {
  it("préfère l’email personnel", () => {
    expect(
      resolveLoginOtpDestination({
        professionalEmail: "paterne.g@sdcreativ.com",
        personalEmail: "paterne@gmail.com",
      }),
    ).toEqual({
      to: "paterne@gmail.com",
      displayTo: "paterne@gmail.com",
      channel: "personal",
    });
  });

  it("retombe sur le pro si pas de perso", () => {
    expect(
      resolveLoginOtpDestination({
        professionalEmail: "paterne.g@sdcreativ.com",
        personalEmail: null,
      }),
    ).toEqual({
      to: "paterne.g@sdcreativ.com",
      displayTo: "paterne.g@sdcreativ.com",
      channel: "professional",
    });
  });

  it("ignore le perso s’il est identique au pro", () => {
    expect(
      resolveLoginOtpDestination({
        professionalEmail: "contact@sdcreativ.com",
        personalEmail: "contact@sdcreativ.com",
      }),
    ).toEqual({
      to: "contact@sdcreativ.com",
      displayTo: "contact@sdcreativ.com",
      channel: "professional",
    });
  });
});

describe("normalizeLoginEmailOtp", () => {
  it("accepte SD-XXXXXX", () => {
    expect(normalizeLoginEmailOtp("SD-A7K2M9")).toBe("SD-A7K2M9");
  });

  it("accepte le suffixe seul", () => {
    expect(normalizeLoginEmailOtp("a7k2m9")).toBe("SD-A7K2M9");
  });

  it("accepte SD collé au suffixe", () => {
    expect(normalizeLoginEmailOtp("SDA7K2M9")).toBe("SD-A7K2M9");
  });

  it("rejette les caractères ambigus", () => {
    expect(normalizeLoginEmailOtp("SD-A7K2O9")).toBeNull();
    expect(normalizeLoginEmailOtp("SD-A7K019")).toBeNull();
  });

  it("rejette les codes trop courts", () => {
    expect(normalizeLoginEmailOtp("SD-A7K")).toBeNull();
  });
});

describe("hashLoginEmailOtp", () => {
  it("normalise la casse avant hash", () => {
    expect(hashLoginEmailOtp("sd-a7k2m9")).toBe(hashLoginEmailOtp("SD-A7K2M9"));
  });
});
