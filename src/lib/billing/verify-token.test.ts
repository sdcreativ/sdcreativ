import { describe, expect, it } from "vitest";
import {
  buildVerifyToken,
  buildPublicVerifyPath,
  isValidVerifyToken,
} from "@/lib/billing/verify-token";

describe("billing/verify-token", () => {
  it("génère un token stable pour une référence", () => {
    const a = buildVerifyToken("quote", "DEV-2026-0001");
    const b = buildVerifyToken("quote", "DEV-2026-0001");
    expect(a).toBe(b);
    expect(a).toHaveLength(32);
  });

  it("valide un token correct", () => {
    const token = buildVerifyToken("invoice", "FAC-2026-0001");
    expect(isValidVerifyToken("invoice", "FAC-2026-0001", token)).toBe(true);
  });

  it("rejette un token incorrect", () => {
    const token = buildVerifyToken("quote", "DEV-2026-0001");
    expect(isValidVerifyToken("quote", "DEV-2026-0002", token)).toBe(false);
    expect(isValidVerifyToken("quote", "DEV-2026-0001", "invalid")).toBe(false);
  });

  it("construit un chemin public de vérification", () => {
    const path = buildPublicVerifyPath("devis", "DEV-2026-0001");
    expect(path).toMatch(/^\/verifier\/devis\/DEV-2026-0001\?t=/);
  });
});
