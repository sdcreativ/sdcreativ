import { describe, expect, it } from "vitest";
import { sanitizeMailError } from "@/lib/mail/sanitize-error";

describe("sanitizeMailError", () => {
  it("redacte password=… et Bearer tokens", () => {
    expect(
      sanitizeMailError("IMAP auth failed password=SecretPass123! for user"),
    ).not.toContain("SecretPass123");
    expect(sanitizeMailError("Authorization Bearer abc.def.ghi")).not.toContain(
      "abc.def",
    );
  });

  it("redacte payloads credentials v1:", () => {
    const out = sanitizeMailError("bad payload v1:YWJjZGVmZ2hpams=");
    expect(out).not.toContain("YWJjZGVmZ2hpams=");
    expect(out).toContain("[redacted]");
  });

  it("accepte une Error et tronque", () => {
    const long = "x".repeat(400);
    const out = sanitizeMailError(new Error(long));
    expect(out.length).toBeLessThanOrEqual(280);
  });
});
