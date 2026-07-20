import { describe, expect, it } from "vitest";
import { generateSignatureOtp, hashSignatureOtp } from "@/lib/signature/otp";

describe("signature/otp", () => {
  it("génère un code SD-XXXXXX sans caractères ambigus", () => {
    const code = generateSignatureOtp();
    expect(code).toMatch(/^SD-[A-Z2-9]{6}$/);
    expect(code).not.toMatch(/[01IO]/);
  });

  it("hash de façon déterministe et case-insensitive", () => {
    const a = hashSignatureOtp("SD-AB12CD");
    const b = hashSignatureOtp(" sd-ab12cd ");
    expect(a).toHaveLength(64);
    expect(a).toBe(b);
    expect(hashSignatureOtp("SD-OTHER1")).not.toBe(a);
  });
});
