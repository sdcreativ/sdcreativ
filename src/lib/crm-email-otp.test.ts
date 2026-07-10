import { describe, expect, it } from "vitest";
import {
  generateLoginEmailOtp,
  hashLoginEmailOtp,
} from "@/lib/crm-email-otp";
import { normalizeLoginEmailOtp } from "@/lib/crm-email-otp-utils";

describe("generateLoginEmailOtp", () => {
  it("génère un code au format SD-XXXXXX", () => {
    const code = generateLoginEmailOtp();
    expect(code).toMatch(/^SD-[A-Z2-9]{6}$/);
    expect(code).not.toMatch(/[01IO]/);
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
